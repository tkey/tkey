// import * as HdKeyring from "eth-hd-keyring";

import BN from "bn.js";
import HdKeyring from "eth-hd-keyring";

import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "../../baseTypes/aggregateTypes";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  seedPhraseFormats: Array<ISeedPhraseFormat>;

  constructor() {
    this.moduleName = "seedPhraseModule";
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setSeedPhrase(seedPhrase: string, seedPhraseType: string): Promise<void> {
    const data = { seedPhraseModule: {} };
    for (let i = 0; i < this.seedPhraseFormats.length; i += 1) {
      const format = this.seedPhraseFormats[i];
      if (format.seedPhraseType === seedPhraseType) {
        if (!format.validateSeedPhrase(seedPhrase)) {
          return Promise.reject(new Error(`Seed phrase is invalid for ${seedPhraseType}`));
        }

        // eslint-disable-next-line no-await-in-loop
        data.seedPhraseModule = await format.formSeedPhraseStore(seedPhrase);
        break;
      }
    }

    return this.tbSDK.setData(data);
  }

  async getSeedPhrase(): Promise<ISeedPhraseStore> {
    const seedPhrase = await this.tbSDK.getData([this.moduleName]);
    return seedPhrase.seedPhraseModule as ISeedPhraseStore;
  }

  async getAccounts(numberOfAccounts = 1): Promise<Array<BN>> {
    const seedPhraseStore = await this.getSeedPhrase();
    for (let i = 0; i < this.seedPhraseFormats.length; i += 1) {
      const format = this.seedPhraseFormats[i];
      if (format.seedPhraseType === seedPhraseStore.seedPhraseType) {
        return format.deriveKeysFromSeedPhrase(seedPhraseStore);
      }
    }

    const seedPhraseString = seedPhraseStore[this.moduleName];
    const keyring = await new HdKeyring({
      mnemonic: seedPhraseString,
      numberOfAccounts,
    });
    return keyring.wallets;
  }
}

export default SeedPhraseModule;
