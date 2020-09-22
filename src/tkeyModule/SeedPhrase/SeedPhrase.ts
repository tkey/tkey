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
    const data = { seedPhraseModule: {} };
    const filteredTypes = this.seedPhraseFormats.filter((format) => format.seedPhraseType === seedPhraseType);
    if (filteredTypes[0]) {
      const format = filteredTypes[0];
      if (!format.validateSeedPhrase(seedPhrase)) {
        return Promise.reject(new Error(`Seed phrase is invalid for ${seedPhraseType}`));
      }
      data.seedPhraseModule = await format.createSeedPhraseStore(seedPhrase);
    } else {
      throw new Error("Format for seedPhraseType does not exist");
    }
    return this.tbSDK.setData(data);
  }

  async getSeedPhrase(): Promise<ISeedPhraseStore> {
    const seedPhrase = await this.tbSDK.getData([this.moduleName]);
    return seedPhrase.seedPhraseModule as ISeedPhraseStore;
  }

  async getAccounts(): Promise<Array<BN>> {
    const seedPhraseStore = await this.getSeedPhrase();
    const filteredTypes = this.seedPhraseFormats.filter((format) => format.seedPhraseType === seedPhraseStore.seedPhraseType);
    if (filteredTypes[0]) {
      const format = filteredTypes[0];
      return format.deriveKeysFromSeedPhrase(seedPhraseStore);
    }
    throw new Error("Format for seedPhraseType does not exist");
  }
}

export default SeedPhraseModule;
