import {
  decrypt,
  encrypt,
  EncryptedMessage,
  getEllipticCurve,
  getPubKeyECC,
  getPubKeyPoint,
  IServiceProvider,
  IStorageLayer,
  KEY_NOT_FOUND,
  KeyType,
  ONE_KEY_DELETE_NONCE,
  ONE_KEY_NAMESPACE,
  prettyPrintError,
  StringifiedType,
  toPrivKeyEC,
  toPrivKeyECC,
  TorusStorageLayerAPIParams,
  TorusStorageLayerArgs,
} from "@tkey/common-types";
import { post } from "@toruslabs/http-helpers";
import base64url from "base64url";
import BN from "bn.js";
import { keccak256 } from "ethereum-cryptography/keccak";
import stringify from "json-stable-stringify";

function signDataWithPrivKey(data: { timestamp: number }, privKey: BN, keyType: KeyType): string {
  const sig = getEllipticCurve(keyType).sign(keccak256(Buffer.from(stringify(data), "utf8")), toPrivKeyECC(privKey), "utf-8");
  return sig.toDER("hex");
}

class TorusStorageLayer implements IStorageLayer {
  enableLogging: boolean;

  hostUrl: string;

  storageLayerName: string;

  serverTimeOffset: number;

  keyType: KeyType;

  constructor({ enableLogging = false, hostUrl = "http://localhost:5051", serverTimeOffset = 0, keyType = "secp256k1" }: TorusStorageLayerArgs) {
    this.enableLogging = enableLogging;
    this.hostUrl = hostUrl;
    this.storageLayerName = "TorusStorageLayer";
    this.serverTimeOffset = serverTimeOffset;
    this.keyType = keyType;
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
      encryptedDetails = await encrypt(getPubKeyECC(privKey, keyType), bufferMetadata);
    } else {
      encryptedDetails = await serviceProvider.encrypt(bufferMetadata);
    }
    const serializedEncryptedDetails = base64url.encode(stringify(encryptedDetails));
    return serializedEncryptedDetails;
  }

  static fromJSON(value: StringifiedType): TorusStorageLayer {
    const { enableLogging, hostUrl, storageLayerName, serverTimeOffset = 0, keyType = "secp256k1" } = value;
    if (storageLayerName !== "TorusStorageLayer") return undefined;
    return new TorusStorageLayer({ enableLogging, hostUrl, serverTimeOffset, keyType });
  }

  /**
   *  Get metadata for a key
   * @param privKey - If not provided, it will use service provider's share for decryption
   */
  async getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<T> {
    const { serviceProvider, privKey } = params;
    const keyDetails = this.generateMetadataParams({}, serviceProvider, privKey);
    const metadataResponse = await post<{ message: string }>(`${this.hostUrl}/get`, keyDetails);
    // returns empty object if object
    if (metadataResponse.message === "") {
      return Object.create({ message: KEY_NOT_FOUND }) as T;
    }
    const encryptedMessage = JSON.parse(base64url.decode(metadataResponse.message));

    let decrypted: Buffer;
    if (privKey) {
      decrypted = await decrypt(toPrivKeyECC(privKey), encryptedMessage);
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
  async setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ message: string }> {
    try {
      const { serviceProvider, privKey, input } = params;
      const metadataParams = this.generateMetadataParams(
        await TorusStorageLayer.serializeMetadataParamsInput(input, serviceProvider, privKey, this.keyType),
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

  async setMetadataStream<T>(params: { input: Array<T>; serviceProvider?: IServiceProvider; privKey?: Array<BN> }): Promise<{ message: string }> {
    try {
      const { serviceProvider, privKey, input } = params;
      const newInput = input;
      const finalMetadataParams = await Promise.all(
        newInput.map(async (el, i) =>
          this.generateMetadataParams(
            await TorusStorageLayer.serializeMetadataParamsInput(el, serviceProvider, privKey[i], this.keyType),
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

  generateMetadataParams(message: unknown, serviceProvider?: IServiceProvider, privKey?: BN): TorusStorageLayerAPIParams {
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
      const unparsedSig = toPrivKeyEC(privKey, this.keyType).sign(hash);
      sig = Buffer.from(unparsedSig.r.toString(16, 64) + unparsedSig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
      const pubK = getPubKeyPoint(privKey, this.keyType);
      pubX = pubK.x.toString("hex");
      pubY = pubK.y.toString("hex");
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

  async acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number; id?: string }> {
    const { serviceProvider, privKey } = params;
    const data = {
      timestamp: Math.floor((this.serverTimeOffset + Date.now()) / 1000),
    };

    let signature: string;
    if (privKey) {
      signature = signDataWithPrivKey(data, privKey, this.keyType);
    } else {
      signature = serviceProvider.sign(new BN(keccak256(Buffer.from(stringify(data), "utf8"))));
    }
    const metadataParams = {
      key: toPrivKeyEC(privKey).getPublic("hex"),
      data,
      signature,
    };
    return post<{ status: number; id?: string }>(`${this.hostUrl}/acquireLock`, metadataParams);
  }

  async releaseWriteLock(params: { id: string; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number }> {
    const { serviceProvider, privKey, id } = params;
    const data = {
      timestamp: Math.floor((this.serverTimeOffset + Date.now()) / 1000),
    };

    let signature: string;
    if (privKey) {
      signature = signDataWithPrivKey(data, privKey, this.keyType);
    } else {
      signature = serviceProvider.sign(new BN(keccak256(Buffer.from(stringify(data), "utf8"))));
    }
    const metadataParams = {
      key: toPrivKeyEC(privKey).getPublic("hex"),
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
      keyType: this.keyType,
    };
  }
}

export default TorusStorageLayer;
