import {
  generateID,
  getPubKeyPoint,
  IServiceProvider,
  IStorageLayer,
  KEY_NOT_FOUND,
  MockStorageLayerArgs,
  StringifiedType,
} from "@tkey/common-types";
import BN from "bn.js";
import stringify from "json-stable-stringify";

class MockStorageLayer implements IStorageLayer {
  dataMap: {
    [key: string]: unknown;
  };

  lockMap: {
    [key: string]: string;
  };

  serviceProvider: IServiceProvider;

  constructor({ dataMap, serviceProvider, lockMap }: MockStorageLayerArgs) {
    this.dataMap = dataMap || {};
    this.serviceProvider = serviceProvider;
    this.lockMap = lockMap || {};
  }

  /**
   *  Get metadata for a key
   * @param privKey If not provided, it will use service provider's share for decryption
   */
  async getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<T> {
    const { serviceProvider, privKey } = params;
    let usedKey: BN;
    if (!privKey) usedKey = serviceProvider.retrievePubKeyPoint().getX();
    else usedKey = getPubKeyPoint(privKey).x;

    const fromMap = this.dataMap[usedKey.toString("hex")];
    if (!fromMap) {
      return Object.create({ message: KEY_NOT_FOUND }) as T;
    }
    return JSON.parse(this.dataMap[usedKey.toString("hex")] as string) as T;
  }

  /**
   * Set Metadata for a key
   * @param input data to post
   * @param privKey If not provided, it will use service provider's share for encryption
   */
  async setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ message: string }> {
    const { serviceProvider, privKey, input } = params;
    let usedKey: BN;
    if (!privKey) usedKey = serviceProvider.retrievePubKeyPoint().getX();
    else usedKey = getPubKeyPoint(privKey).x;
    this.dataMap[usedKey.toString("hex")] = stringify(input);
    return { message: "success" };
  }

  async setMetadataStream<T>(params: { input: Array<T>; serviceProvider?: IServiceProvider; privKey?: Array<BN> }): Promise<{ message: string }> {
    const { serviceProvider, privKey, input } = params;
    // console.log(privKey);
    input.forEach((el, index) => {
      let usedKey: BN;
      if (!privKey || !privKey[index]) usedKey = serviceProvider.retrievePubKeyPoint().getX();
      else usedKey = getPubKeyPoint(privKey[index]).x;
      this.dataMap[usedKey.toString("hex")] = stringify(el);
      console.log(this.dataMap[usedKey.toString("hex")]);
    });

    return { message: "success" };
  }

  async acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number; id?: string }> {
    const { serviceProvider, privKey } = params;
    let usedKey: BN;
    if (!privKey) usedKey = serviceProvider.retrievePubKeyPoint().getX();
    else usedKey = getPubKeyPoint(privKey).x;
    if (this.lockMap[usedKey.toString("hex")]) return { status: 0 };
    const id = generateID();
    this.lockMap[usedKey.toString("hex")] = id;
    return { status: 1, id };
  }

  async releaseWriteLock(params: { id: string; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number }> {
    const { serviceProvider, privKey, id } = params;
    let usedKey: BN;
    if (!privKey) usedKey = serviceProvider.retrievePubKeyPoint().getX();
    else usedKey = getPubKeyPoint(privKey).x;
    if (!this.lockMap[usedKey.toString("hex")]) return { status: 0 };
    if (id !== this.lockMap[usedKey.toString("hex")]) return { status: 2 };
    this.lockMap[usedKey.toString("hex")] = null;
    return { status: 1 };
  }

  toJSON(): StringifiedType {
    return {
      dataMap: this.dataMap,
      serviceProvider: this.serviceProvider,
    };
  }

  static fromJSON(value: StringifiedType): MockStorageLayer {
    const { dataMap, serviceProvider, lockMap } = value;
    return new MockStorageLayer({ dataMap, serviceProvider, lockMap });
  }
}

export default MockStorageLayer;
