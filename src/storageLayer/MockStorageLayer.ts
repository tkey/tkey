import BN from "bn.js";
import stringify from "json-stable-stringify";

import { getPubKeyPoint } from "../base";
import { IServiceProvider, IStorageLayer, MockStorageLayerArgs, StringifiedType } from "../baseTypes/commonTypes";
import { KEY_NOT_FOUND } from "../utils";

class MockStorageLayer implements IStorageLayer {
  dataMap: {
    [key: string]: unknown;
  };

  serviceProvider: IServiceProvider;

  constructor({ dataMap, serviceProvider }: MockStorageLayerArgs) {
    this.dataMap = dataMap || {};
    this.serviceProvider = serviceProvider;
  }

  /**
   *  Get metadata for a key
   * @param privKey If not provided, it will use service provider's share for decryption
   */
  async getMetadata<T>(privKey?: BN): Promise<T> {
    let usedKey;
    if (!privKey) usedKey = this.serviceProvider.retrievePubKeyPoint().getX();
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
  async setMetadata<T>(input: T, privKey?: BN): Promise<{ message: string }> {
    let usedKey;
    if (!privKey) usedKey = this.serviceProvider.retrievePubKeyPoint().getX();
    else usedKey = getPubKeyPoint(privKey).x;
    this.dataMap[usedKey.toString("hex")] = stringify(input);
    return { message: "success" };
  }

  /**
   * Set Metadata for keys
   * @param input data to post
   * @param privKey If not provided, it will use service provider's share for encryption
   */
  async setMetadataBulk<T>(input: Array<T>, privKey?: Array<BN>): Promise<{ message: string }[]> {
    input.forEach((el, index) => {
      let usedKey;
      if (!privKey || !privKey[index]) usedKey = this.serviceProvider.retrievePubKeyPoint().getX();
      else usedKey = getPubKeyPoint(privKey[index]).x;
      this.dataMap[usedKey.toString("hex")] = stringify(el);
    });

    return [{ message: "success" }];
  }

  toJSON(): StringifiedType {
    return {
      dataMap: this.dataMap,
      serviceProvider: this.serviceProvider,
    };
  }

  static fromJSON(value: StringifiedType): MockStorageLayer {
    const { dataMap, serviceProvider } = value;
    return new MockStorageLayer({ dataMap, serviceProvider });
  }
}

export default MockStorageLayer;
