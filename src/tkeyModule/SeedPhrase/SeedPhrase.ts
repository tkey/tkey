import BN from "bn.js";

import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "../../baseTypes/aggregateTypes";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  seedPhraseFormats: ISeedPhraseFormat[];

  constructor(formats: ISeedPhraseFormat[]) {
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
    const format = this.seedPhraseFormats.find((el) => el.seedPhraseType === seedPhraseType);
    if (!format) {
      throw new Error("Seed phrase type is not supported");
    }
    if (!format.validateSeedPhrase(seedPhrase)) {
      throw new Error(`Seed phrase is invalid for ${seedPhraseType}`);
    }
    data[seedPhraseType] = await format.createSeedPhraseStore(seedPhrase);
    return this.tbSDK.setTKeyStore(this.moduleName, data);
  }

  async getSeedPhrase(key: string): Promise<ISeedPhraseStore> {
    return this.tbSDK.getTKeyStore(this.moduleName, key);
  }

  async getAccounts(): Promise<Array<BN>> {
    try {
      // Get seed phrases for all available formats from tkeystore
      const promisesArray = this.seedPhraseFormats.map((el) => {
        return this.getSeedPhrase(el.seedPhraseType);
      });
      const seedPhrases = await Promise.all(promisesArray);

      // Derive keys for all formats.
      return this.seedPhraseFormats.reduce((acc, x, index) => {
        acc.push(...x.deriveKeysFromSeedPhrase(seedPhrases[index]));
        return acc;
      }, []);
    } catch (err) {
      return [];
    }
  }
}

export default SeedPhraseModule;
