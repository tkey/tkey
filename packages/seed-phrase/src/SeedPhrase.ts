import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import SeedPhraseError from "./errors";

export const SEED_PHRASE_MODULE_NAME = "seedPhraseModule";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  seedPhraseFormats: ISeedPhraseFormat[];

  constructor(formats: ISeedPhraseFormat[]) {
    this.moduleName = SEED_PHRASE_MODULE_NAME;
    this.seedPhraseFormats = formats;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK.addReconstructKeyMiddleware(this.moduleName, this.getAccounts.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setSeedPhrase(seedPhraseType: string, seedPhrase?: string): Promise<void> {
    const format = this.seedPhraseFormats.find((el) => el.type === seedPhraseType);
    if (!format) {
      throw SeedPhraseError.notSupported();
      // throw new Error("Seed phrase type is not supported");
    }
    if (seedPhrase && !format.validateSeedPhrase(seedPhrase)) {
      throw new Error(`Seed phrase is invalid for ${seedPhraseType}`);
    }
    const seedPhraseStore = await format.createSeedPhraseStore(seedPhrase);
    return this.tbSDK.setTKeyStoreItem(this.moduleName, seedPhraseStore);
  }

  async setSeedPhraseStoreItem(partialStore: ISeedPhraseStore): Promise<void> {
    const seedPhraseItem = (await this.tbSDK.getTKeyStoreItem(this.moduleName, partialStore.id)) as ISeedPhraseStore;
    const originalItem: ISeedPhraseStore = { id: seedPhraseItem.id, type: seedPhraseItem.type, seedPhrase: seedPhraseItem.seedPhrase };
    // Disallow editing critical fields
    const finalItem = { ...partialStore, ...originalItem };
    return this.tbSDK.setTKeyStoreItem(this.moduleName, finalItem);
  }

  async getSeedPhrases(): Promise<ISeedPhraseStore[]> {
    return this.tbSDK.getTKeyStore(this.moduleName) as Promise<ISeedPhraseStore[]>;
  }

  async getAccounts(): Promise<BN[]> {
    try {
      // Get seed phrases for all available formats from tkeystore
      const seedPhrases = await this.getSeedPhrases();
      return seedPhrases.reduce((acc: BN[], x) => {
        const suitableFormat = this.seedPhraseFormats.find((y) => y.type === x.type);
        acc.push(...suitableFormat.deriveKeysFromSeedPhrase(x));
        return acc;
      }, []);
    } catch (err) {
      return [];
    }
  }
}

export default SeedPhraseModule;
