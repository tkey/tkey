import {
  decrypt,
  ecCurve,
  encrypt,
  EncryptedMessage,
  getPubKeyECC,
  getPubKeyPoint,
  IServiceProvider,
  IStorageLayer,
  KEY_NOT_FOUND,
  StringifiedType,
  stripHexPrefix,
  toPrivKeyEC,
  toPrivKeyECC,
  TorusStorageLayerAPIParams,
  TorusStorageLayerArgs,
} from "@tkey/common-types";
import { post } from "@toruslabs/http-helpers";
import BN from "bn.js";
import stringify from "json-stable-stringify";
import { keccak256 } from "web3-utils";

function signDataWithPrivKey(data: { timestamp: number }, privKey: BN): string {
  const sig = ecCurve.sign(stripHexPrefix(keccak256(stringify(data))), toPrivKeyECC(privKey), "utf-8");
  return sig.toDER();
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

  /**
   *  Get metadata for a key
   * @param privKey If not provided, it will use service provider's share for decryption
   */
  async getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<T> {
    const { serviceProvider, privKey } = params;
    const keyDetails = this.generateMetadataParams({}, serviceProvider, privKey);
    const metadataResponse = await post<{ message: string }>(`${this.hostUrl}/get`, keyDetails);
    // returns empty object if object
    if (metadataResponse.message === "") {
      return Object.create({ message: KEY_NOT_FOUND }) as T;
    }
    const encryptedMessage = JSON.parse(atob(metadataResponse.message));

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
   * @param input data to post
   * @param privKey If not provided, it will use service provider's share for encryption
   */
  async setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ message: string }> {
    const { serviceProvider, privKey, input } = params;
    const bufferMetadata = Buffer.from(stringify(input));
    let encryptedDetails: EncryptedMessage;
    if (privKey) {
      encryptedDetails = await encrypt(getPubKeyECC(privKey), bufferMetadata);
    } else {
      encryptedDetails = await serviceProvider.encrypt(bufferMetadata);
    }
    const serializedEncryptedDetails = btoa(stringify(encryptedDetails));
    const metadataParams = this.generateMetadataParams(serializedEncryptedDetails, serviceProvider, privKey);
    return post<{ message: string }>(`${this.hostUrl}/set`, metadataParams);
  }

  async setMetadataStream<T>(params: { input: Array<T>; serviceProvider?: IServiceProvider; privKey?: Array<BN> }): Promise<{ message: string }> {
    const { serviceProvider, privKey, input } = params;
    const newInput = input;
    const finalMetadataParams = await Promise.all(
      newInput.map(async (el, i) => {
        const bufferMetadata = Buffer.from(stringify(el));
        let encryptedDetails: EncryptedMessage;
        if (privKey[i]) {
          encryptedDetails = await encrypt(getPubKeyECC(privKey[i]), bufferMetadata);
        } else {
          encryptedDetails = await serviceProvider.encrypt(bufferMetadata);
        }
        const serializedEncryptedDetails = btoa(stringify(encryptedDetails));
        const metadataParams = this.generateMetadataParams(serializedEncryptedDetails, serviceProvider, privKey[i]);
        return metadataParams;
      })
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
    };
    return post<{ message: string }>(`${this.hostUrl}/bulk_set_stream`, FD, options, customOptions);
  }

  generateMetadataParams(message: unknown, serviceProvider?: IServiceProvider, privKey?: BN): TorusStorageLayerAPIParams {
    let sig: string;
    let pubX: string;
    let pubY: string;
    const setTKeyStore = {
      data: message,
      timestamp: new BN(~~((this.serverTimeOffset + Date.now()) / 1000)).toString(16),
    };
    const hash = keccak256(stringify(setTKeyStore)).slice(2);
    if (privKey) {
      const unparsedSig = toPrivKeyEC(privKey).sign(hash);
      sig = Buffer.from(unparsedSig.r.toString(16, 64) + unparsedSig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
      const pubK = getPubKeyPoint(privKey);
      pubX = pubK.x.toString("hex");
      pubY = pubK.y.toString("hex");
    } else {
      const point = serviceProvider.retrievePubKeyPoint();
      sig = serviceProvider.sign(hash);
      pubX = point.getX().toString("hex");
      pubY = point.getY().toString("hex");
    }
    // console.log(pubX, "pub key x");
    return {
      pub_key_X: pubX,
      pub_key_Y: pubY,
      set_data: setTKeyStore,
      signature: sig,
      namespace: "tkey",
    };
  }

  async acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number; id?: string }> {
    const { serviceProvider, privKey } = params;
    const data = {
      timestamp: Math.floor((this.serverTimeOffset + Date.now()) / 1000),
    };

    let signature: string;
    if (privKey) {
      signature = signDataWithPrivKey(data, privKey);
    } else {
      signature = serviceProvider.sign(stripHexPrefix(keccak256(stringify(data))));
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
      signature = signDataWithPrivKey(data, privKey);
    } else {
      signature = serviceProvider.sign(stripHexPrefix(keccak256(stringify(data))));
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
    };
  }

  static fromJSON(value: StringifiedType): TorusStorageLayer {
    const { enableLogging, hostUrl, storageLayerName, serverTimeOffset = 0 } = value;
    if (storageLayerName !== "TorusStorageLayer") return undefined;
    return new TorusStorageLayer({ enableLogging, hostUrl, serverTimeOffset });
  }
}

export default TorusStorageLayer;
