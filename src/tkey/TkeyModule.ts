// import bip39 from "bip39";
import { validateMnemonic } from "bip39";
// import BN from "bn.js";
import stringify from "json-stable-stringify";

import { IModule, ITKeyApi, TkeyStoreArgs } from "../baseTypes/aggregateTypes";
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

  async addSeedPhrase(seedPhrase: string): Promise<void> {
    if (!(seedPhrase.trim().split(/\s+/g).length >= 12 && seedPhrase.trim().split(/\s+/g).length % 3 === 0)) {
      throw new Error("invalid number of words in seed phrase");
    }
    if (!validateMnemonic(seedPhrase)) {
      throw new Error("invalid mnemonic");
    }

    const metadata = this.tbSDK.getMetadata();
    let rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawTkeyStore) {
      metadata.setGeneralStoreDomain(this.moduleName, new TkeyStore({}));
      rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    }
    const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);
    const seedPhraseBuffer = Buffer.from(seedPhrase);
    const encrpytedSeedPhraseBuffer = await this.tbSDK.encrypt(seedPhraseBuffer);
    tkeyStore.seedPhrase = btoa(stringify(encrpytedSeedPhraseBuffer));

    // const newSeedPhraseStore = new TkeyStore({ seedPhrase: btoa(stringify(encrpytedSeedPhraseBuffer)) });
    metadata.setGeneralStoreDomain(this.moduleName, tkeyStore);
    await this.tbSDK.syncShareMetadata();
  }

  async deleteSeedPhrase(): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawTkeyStore) {
      throw new Error("Tkey store does not exist. Unable to delete seed hrase");
    }
    const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);
    tkeyStore.seedPhrase = undefined;
    metadata.setGeneralStoreDomain(this.moduleName, tkeyStore);
    await this.tbSDK.syncShareMetadata();
  }

  // async addPrivateKeys(privateKeys: Array<string>): Promise<void> {
  //   const metadata = this.tbSDK.getMetadata();
  //   let rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
  //   if (!rawTkeyStore) {
  //     metadata.setGeneralStoreDomain(this.moduleName, new TkeyStore({}));
  //     rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
  //   }
  //   const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);
  //   const currentPrivateKeys = tkeyStore.privateKeys;
  //   if (currentPrivateKeys) privateKeys.concat(currentPrivateKeys);
  //   const privateKeysBuffer = Buffer.from(privateKeys);
  //   const encrpytedPrivateKeysBuffer = await this.tbSDK.encrypt(privateKeysBuffer);
  //   tkeyStore.privateKeys = btoa(stringify(encrpytedPrivateKeysBuffer));

  //   // const newSeedPhraseStore = new TkeyStore({ seedPhrase: btoa(stringify(encrpytedSeedPhraseBuffer)) });
  //   metadata.setGeneralStoreDomain(this.moduleName, tkeyStore);
  //   await this.tbSDK.syncShareMetadata();
  // }

  async getSeedPhraseFromTkeyStore(): Promise<Buffer> {
    const metadata = this.tbSDK.getMetadata();
    const rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawTkeyStore) throw new Error("tkey store doesn't exist");
    const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);

    const { seedPhrase } = tkeyStore;
    if (!seedPhrase) throw new Error("Seed phrase does not exist.");

    const encryptedMessage = JSON.parse(atob(seedPhrase));
    const decryptedSeedPhrase = await this.tbSDK.decrypt(encryptedMessage);
    return decryptedSeedPhrase;
  }

  // async getPrivateKeysFromTkeyStore(): Promise<Buffer> {
  //   const metadata = this.tbSDK.getMetadata();
  //   const rawTkeyStore = metadata.getGeneralStoreDomain(this.moduleName);
  //   if (!rawTkeyStore) throw new Error("tkey store doesn't exist");
  //   const tkeyStore = new TkeyStore(rawTkeyStore as TkeyStoreArgs);

  //   const { privateKeys } = tkeyStore;
  //   if (!privateKeys) throw new Error("Seed phrase does not exist.");

  //   const encryptedMessage = JSON.parse(atob(privateKeys));
  //   const decryptedSeedPhrase = await this.tbSDK.decrypt(encryptedMessage);
  //   return decryptedSeedPhrase;
  // }

  // getPrivateKeys(number?: number) {
  //   // This requires importing ethjs/hd wallet, should be implemented outside the library
  //   // const seedPhraseStore = this.getSeedPhraseStore()
  // }
}

export default TkeyModule;
