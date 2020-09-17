// // import bip39 from "bip39";
// import { validateMnemonic } from "bip39";
// import { debug } from "console";
// import BN from "bn.js";
import stringify from "json-stable-stringify";

import { IModule, ITKeyApi, TkeyStoreArgs, TkeyStoreDataArgs } from "../baseTypes/aggregateTypes";
// import { ecCurve } from "../utils";
import TkeyStore from "./TkeyStore";

class TkeyModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = "tkeyModule";
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setData(data: unknown): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    let rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawTkeyStore) {
      metadata.setGeneralStoreDomain(this.moduleName, new TkeyStore({ data: {} }));
      rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    }
    const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);

    // Encryption promises
    const newData = data;
    const newEncryptedPromises = Object.keys(newData).map((el) => {
      const value = JSON.stringify(data[el]);
      const newBuffer = Buffer.from(value);
      return this.tbSDK.encrypt(newBuffer);
    });

    let encryptedDataArray;
    try {
      encryptedDataArray = await Promise.all(newEncryptedPromises);
    } catch (err) {
      throw new Error("Unable to encrypt data");
    }

    // Type cast as dictionary
    Object.keys(newData).forEach((el, index) => {
      newData[el] = stringify(encryptedDataArray[index]);
    });
    tkeyStore.data = Object.assign(tkeyStore.data, newData as TkeyStoreDataArgs);

    // update metadatStore
    metadata.setGeneralStoreDomain(this.moduleName, tkeyStore);
    await this.tbSDK.syncShareMetadata();
  }

  async deleteKey(): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawTkeyStore) {
      throw new Error("Tkey store does not exist. Unable to delete seed hrase");
    }
    const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);
    delete tkeyStore.data.seedPhrase;
    metadata.setGeneralStoreDomain(this.moduleName, tkeyStore);
    await this.tbSDK.syncShareMetadata();
  }

  async getData(): Promise<TkeyStoreDataArgs> {
    const metadata = this.tbSDK.getMetadata();
    const rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawTkeyStore) throw new Error("tkey store doesn't exist");
    const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);

    // Decryption promises
    const { data } = tkeyStore;
    const newData = data;
    const newDecryptionPromises = Object.keys(newData).map((el) => {
      const toDecrypt = JSON.parse(newData[el]);
      return this.tbSDK.decrypt(toDecrypt);
    });

    let decryptedDataArray;
    try {
      decryptedDataArray = await Promise.all(newDecryptionPromises);
    } catch (err) {
      throw new Error("Unable to encrypt data");
    }

    // JSON parsing
    Object.keys(newData).forEach((el, index) => {
      newData[el] = JSON.parse(decryptedDataArray[index]);
    });

    // typeCasting
    tkeyStore.data = newData as TkeyStoreDataArgs;
    return tkeyStore.data;
  }
}

export default TkeyModule;
