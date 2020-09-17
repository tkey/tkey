// import bip39 from "bip39";
import { validateMnemonic } from "bip39";
// import BN from "bn.js";
import stringify from "json-stable-stringify";

import { IModule, ITKeyApi, SeedPhraseStoreArgs } from "../baseTypes/aggregateTypes";
// import { ecCurve } from "../utils";
import SeedPhraseStore from "./SeedPhraseStore";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = "seedPhrase";
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

    // const seed = new BN(seedPhrase);
    // const moddedSeed = seed.umod(ecCurve.curve.n);
    // if (seed.cmp(moddedSeed) !== 0) {
    //   throw new Error("seed phrase not in secp256k1 curve group, you're really unlucky");
    // }

    const metadata = this.tbSDK.getMetadata();
    const seedPhraseBuffer = Buffer.from(seedPhrase);
    const encrpytedSeedPhraseBuffer = await this.tbSDK.encrypt(seedPhraseBuffer);
    const newSeedPhraseStore = new SeedPhraseStore({ seedPhrase: btoa(stringify(encrpytedSeedPhraseBuffer)) });
    metadata.setGeneralStoreDomain(this.moduleName, newSeedPhraseStore);
    await this.tbSDK.syncShareMetadata();
    // return this.tbSDK.initialize(undefined, seed);
  }

  async getSeedPhraseStore() {
    const metadata = this.tbSDK.getMetadata();
    const rawSeedPhraseStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawSeedPhraseStore) throw new Error("Seed Phrase doesn't exist");
    const seedPhraseStore = new SeedPhraseStore(rawSeedPhraseStore as SeedPhraseStoreArgs);
    const encryptedMessage = JSON.parse(atob(seedPhraseStore.seedPhrase));
    const decryptedSeedPhrase = await this.tbSDK.decrypt(encryptedMessage);
    return decryptedSeedPhrase;
  }

  // getPrivateKeys(number?: number) {
  //   // This requires importing ethjs/hd wallet, should be implemented outside the library
  //   // const seedPhraseStore = this.getSeedPhraseStore()
  // }
}

export default SeedPhraseModule;
