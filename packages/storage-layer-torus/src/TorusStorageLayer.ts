import {
  decrypt,
  encrypt,
  EncryptedMessage,
  IServiceProvider,
  IStorageLayer,
  KEY_NOT_FOUND,
  KeyType,
  keyTypeToCurve,
  ONE_KEY_DELETE_NONCE,
  ONE_KEY_NAMESPACE,
  Point,
  prettyPrintError,
  StringifiedType,
  TorusStorageLayerAPIParams,
  TorusStorageLayerArgs,
} from "@tkey/common-types";
import { post } from "@toruslabs/http-helpers";
import base64url from "base64url";
import BN from "bn.js";
import { ec as EllipticCurve } from "elliptic";
import { keccak256 } from "ethereum-cryptography/keccak";
import stringify from "json-stable-stringify";

function signDataWithPrivKey(data: { timestamp: number }, privKey: BN, ecCurve: EllipticCurve): string {
  // const sig = ecCurve.keyFromPrivate(privKey).sign(keccak256(Buffer.from(stringify(data), "utf8")));
  const sig = ecCurve.sign(keccak256(Buffer.from(stringify(data), "utf8")), privKey.toBuffer(), "utf-8");
  return sig.toDER("hex");
}

class TorusStorageLayer implements IStorageLayer {
  enableLogging: boolean;

  hostUrl: string;

  storageLayerName: string;

  serverTimeOffset: number;

  constructor({ enableLogging = false, hostUrl = "http://localhost:5051", serverTimeOffset = 0 }: TorusStorageLayerArgs) {
    this.enableLogging = enableLogging;
    this.hostUrl = hostUrl;
    this.storageLayerName = "TorusStorageLayer";
    this.serverTimeOffset = serverTimeOffset;
  }

  static async serializeMetadataParamsInput(el: unknown, serviceProvider: IServiceProvider, privKey: BN, keyType: KeyType): Promise<unknown> {
    if (typeof el === "object") {
      // Allow using of special message as command, in which case, do not encrypt
      const obj = el as Record<string, unknown>;
      const isCommandMessage = obj.message === ONE_KEY_DELETE_NONCE;
      if (isCommandMessage) return obj.message;
    }

    // General case, encrypt message
    const bufferMetadata = Buffer.from(stringify(el));
    let encryptedDetails: EncryptedMessage;
    if (privKey) {
      let encKey = privKey;
      if (keyType === KeyType.ed25519) {
        const ecCurve = keyTypeToCurve(keyType);
        encKey = new BN(keccak256(privKey.toBuffer())).umod(ecCurve.curve.n);
      }
      encryptedDetails = await encrypt(encKey.toBuffer(), bufferMetadata);
    } else {
      encryptedDetails = await serviceProvider.encrypt(bufferMetadata);
    }
    const serializedEncryptedDetails = base64url.encode(stringify(encryptedDetails));
    return serializedEncryptedDetails;
  }

  static fromJSON(value: StringifiedType): TorusStorageLayer {
    const { enableLogging, hostUrl, storageLayerName, serverTimeOffset = 0 } = value;
    if (storageLayerName !== "TorusStorageLayer") return undefined;
    return new TorusStorageLayer({ enableLogging, hostUrl, serverTimeOffset });
  }

  /**
   *  Get metadata for a key
   * @param privKey - If not provided, it will use service provider's share for decryption
   */
  async getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<T> {
    const { serviceProvider, privKey, keyType } = params;
    const ecCurve = keyTypeToCurve(keyType);
    const keyDetails = this.generateMetadataParams({}, keyType, serviceProvider, privKey);
    const metadataResponse = await post<{ message: string }>(`${this.hostUrl}/get`, keyDetails);
    // returns empty object if object
    if (metadataResponse.message === "") {
      return Object.create({ message: KEY_NOT_FOUND }) as T;
    }
    const encryptedMessage = JSON.parse(base64url.decode(metadataResponse.message));

    let decrypted: Buffer;
    if (privKey) {
      let encKey = privKey;
      if (keyType === KeyType.ed25519) {
        encKey = new BN(keccak256(privKey.toBuffer())).umod(ecCurve.curve.n);
      }
      decrypted = await decrypt(encKey.toBuffer(), encryptedMessage);
    } else {
      decrypted = await serviceProvider.decrypt(encryptedMessage);
    }

    return JSON.parse(decrypted.toString()) as T;
  }

  /**
   * Set Metadata for a key
   * @param input - data to post
   * @param privKey - If not provided, it will use service provider's share for encryption
   */
  async setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<{ message: string }> {
    try {
      const { serviceProvider, privKey, input, keyType } = params;
      const metadataParams = this.generateMetadataParams(
        await TorusStorageLayer.serializeMetadataParamsInput(input, serviceProvider, privKey, keyType),
        keyType,
        serviceProvider,
        privKey
      );
      return await post<{ message: string }>(`${this.hostUrl}/set`, metadataParams);
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let apiError: any;
      try {
        apiError = await (error as Response).json();
      } catch (error2) {
        // ignore error2. it means not an api error
        throw error;
      }
      if (apiError) throw new Error(prettyPrintError(apiError));
    }
  }

  async setMetadataStream<T>(params: {
    input: Array<T>;
    serviceProvider?: IServiceProvider;
    privKey?: Array<BN>;
    keyType: KeyType;
  }): Promise<{ message: string }> {
    try {
      const { serviceProvider, privKey, input, keyType } = params;
      const newInput = input;
      const finalMetadataParams = await Promise.all(
        newInput.map(async (el, i) =>
          this.generateMetadataParams(
            await TorusStorageLayer.serializeMetadataParamsInput(el, serviceProvider, privKey[i], keyType),
            keyType,
            serviceProvider,
            privKey[i]
          )
        )
      );

      const FD = new FormData();
      finalMetadataParams.forEach((el, index) => {
        FD.append(index.toString(), JSON.stringify(el));
      });
      const options: RequestInit = {
        mode: "cors",
        method: "POST",
        headers: {
          "Content-Type": undefined,
        },
      };

      const customOptions = {
        isUrlEncodedData: true,
        timeout: 600 * 1000, // 10 mins of timeout for excessive shares case
      };
      return await post<{ message: string }>(`${this.hostUrl}/bulk_set_stream`, FD, options, customOptions);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let apiError: any;
      try {
        apiError = await (error as Response).json();
      } catch (error2) {
        // ignore error2. it means not an api error
        throw error;
      }
      if (apiError) throw new Error(prettyPrintError(apiError));
    }
  }

  generateMetadataParams(message: unknown, keyType: KeyType, serviceProvider?: IServiceProvider, privKey?: BN): TorusStorageLayerAPIParams {
    let sig: string;
    let pubX: string;
    let pubY: string;
    let namespace = "tkey";
    const setTKeyStore = {
      data: message,
      timestamp: new BN(~~((this.serverTimeOffset + Date.now()) / 1000)).toString(16),
    };

    // Overwrite bulk_set to allow deleting nonce v2 together with creating tKey.
    // This is a workaround, a better solution is allow upstream API to set tableName/namespace of metadata params
    if (message === ONE_KEY_DELETE_NONCE) {
      namespace = ONE_KEY_NAMESPACE;
      setTKeyStore.data = "<deleted>";
    }

    const hash = keccak256(Buffer.from(stringify(setTKeyStore), "utf8"));
    if (privKey) {
      const ecCurve = keyTypeToCurve(keyType);
      const signKeyPair = ecCurve.keyFromPrivate(privKey.toBuffer());
      const unparsedSig = signKeyPair.sign(hash);
      sig = Buffer.from(unparsedSig.r.toString(16, 64) + unparsedSig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
      const pubK = signKeyPair.getPublic();
      pubX = pubK.getX().toString("hex");
      pubY = pubK.getY().toString("hex");
    } else {
      const point = serviceProvider.retrievePubKeyPoint();
      sig = serviceProvider.sign(new BN(hash));
      pubX = point.getX().toString("hex");
      pubY = point.getY().toString("hex");
    }
    return {
      pub_key_X: pubX,
      pub_key_Y: pubY,
      set_data: setTKeyStore,
      signature: sig,
      namespace,
    };
  }

  async acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<{ status: number; id?: string }> {
    const { serviceProvider, privKey, keyType } = params;
    const data = {
      timestamp: Math.floor((this.serverTimeOffset + Date.now()) / 1000),
    };

    const ecCurve = keyTypeToCurve(keyType);
    let signature: string;
    if (privKey) {
      signature = signDataWithPrivKey(data, privKey, ecCurve);
    } else {
      signature = serviceProvider.sign(new BN(keccak256(Buffer.from(stringify(data), "utf8"))));
    }
    const metadataParams = {
      key: ecCurve.keyFromPrivate(privKey.toBuffer()).getPublic("hex"),
      data,
      signature,
    };
    return post<{ status: number; id?: string }>(`${this.hostUrl}/acquireLock`, metadataParams);
  }

  async releaseWriteLock(params: { id: string; serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<{ status: number }> {
    const { serviceProvider, privKey, id, keyType } = params;
    const data = {
      timestamp: Math.floor((this.serverTimeOffset + Date.now()) / 1000),
    };

    let signature: string;
    if (privKey) {
      signature = signDataWithPrivKey(data, privKey, keyTypeToCurve(keyType));
    } else {
      signature = serviceProvider.sign(new BN(keccak256(Buffer.from(stringify(data), "utf8"))));
    }
    const metadataParams = {
      key: Point.fromPrivate(privKey, keyType).toSEC1(),
      data,
      signature,
      id,
    };
    return post<{ status: number; id?: string }>(`${this.hostUrl}/releaseLock`, metadataParams);
  }

  toJSON(): StringifiedType {
    return {
      enableLogging: this.enableLogging,
      hostUrl: this.hostUrl,
      storageLayerName: this.storageLayerName,
    };
  }
}

export default TorusStorageLayer;
