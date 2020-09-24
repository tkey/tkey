import BN from "bn.js";

import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "../../baseTypes/aggregateTypes";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  seedPhraseFormats: Array<ISeedPhraseFormat>;

  constructor(formats: Array<ISeedPhraseFormat>) {
    this.moduleName = "seedPhraseModule";
    this.seedPhraseFormats = formats;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK.addReconstructKeyMiddleware(this.moduleName, this.getAccounts.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setSeedPhrase(seedPhrase: string, seedPhraseType: string): Promise<void> {
    const data = {};
    const filteredTypes = this.seedPhraseFormats.filter((format) => format.seedPhraseType === seedPhraseType);
    if (filteredTypes[0]) {
      const format = filteredTypes[0];
      if (!format.validateSeedPhrase(seedPhrase)) {
        return Promise.reject(new Error(`Seed phrase is invalid for ${seedPhraseType}`));
      }
      data[seedPhraseType] = await format.createSeedPhraseStore(seedPhrase);
    } else {
      throw new Error("Format for seedPhraseType does not exist");
    }
    return this.tbSDK.setData(this.moduleName, data);
  }

  async getSeedPhrase(key: string): Promise<ISeedPhraseStore> {
    let seedPhrase: ISeedPhraseStore;
    try {
      seedPhrase = await this.tbSDK.getData(this.moduleName, key);
      return seedPhrase as ISeedPhraseStore;
    } catch (err) {
      return err;
    }
  }

  async getAccounts(): Promise<Array<BN>> {
    try {
      // Get seed phrases for all available formats from tkeystore
      const promisesArray = this.seedPhraseFormats.map((el) => {
        return this.getSeedPhrase(el.seedPhraseType);
      });
      const seedPhrases = await Promise.all(promisesArray);

      // Derive keys for all formats.
      const derivedKeys = this.seedPhraseFormats
        .map((el, index) => {
          return el.deriveKeysFromSeedPhrase(seedPhrases[index]);
        })
        .flat(1);
      return derivedKeys;
    } catch (err) {
      return [];
      // throw new Error("Format for seedPhraseType does not exist");
    }
  }
}

export default SeedPhraseModule;
