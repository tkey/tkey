import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ISeedPhraseStoreWithKeys, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import SeedPhraseError from "./errors";

export const SEED_PHRASE_MODULE_NAME = "seedPhraseModule";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tkey: ITKeyApi;

  seedPhraseFormats: ISeedPhraseFormat[];

  constructor(formats: ISeedPhraseFormat[]) {
    this.moduleName = SEED_PHRASE_MODULE_NAME;
    this.seedPhraseFormats = formats;
  }

  setModuleReferences(tkey: ITKeyApi): void {
    tkey._addReconstructKeyMiddleware(this.moduleName, this.getAccounts.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setSeedPhrase(tkey: ITKeyApi, seedPhraseType: string, seedPhrase?: string): Promise<void> {
    const format = this.seedPhraseFormats.find((el) => el.type === seedPhraseType);
    if (!format) {
      throw SeedPhraseError.notSupported();
    }
    if (seedPhrase && !format.validateSeedPhrase(seedPhrase)) {
      throw SeedPhraseError.invalid(`${seedPhraseType}`);
    }
    const seedPhraseStore = await format.createSeedPhraseStore(seedPhrase);
    return tkey._setTKeyStoreItem(this.moduleName, seedPhraseStore);
  }

  async setSeedPhraseStoreItem(tkey: ITKeyApi, partialStore: ISeedPhraseStore): Promise<void> {
    const seedPhraseItem = (await tkey.getTKeyStoreItem(this.moduleName, partialStore.id)) as ISeedPhraseStore;
    const originalItem: ISeedPhraseStore = { id: seedPhraseItem.id, type: seedPhraseItem.type, seedPhrase: seedPhraseItem.seedPhrase };
    // Disallow editing critical fields
    const finalItem = { ...partialStore, ...originalItem };
    return tkey._setTKeyStoreItem(this.moduleName, finalItem);
  }

  async CRITICAL_changeSeedPhrase(tkey: ITKeyApi, oldSeedPhrase: string, newSeedPhrase: string): Promise<void> {
    const seedPhrases = await this.getSeedPhrases(tkey);
    const itemToChange = seedPhrases.find((x) => x.seedPhrase === oldSeedPhrase);
    itemToChange.seedPhrase = newSeedPhrase;
    return tkey._setTKeyStoreItem(this.moduleName, itemToChange);
  }

  async getSeedPhrases(tkey: ITKeyApi): Promise<ISeedPhraseStore[]> {
    return tkey.getTKeyStore(this.moduleName) as Promise<ISeedPhraseStore[]>;
  }

  async getSeedPhrasesWithAccounts(tkey: ITKeyApi): Promise<ISeedPhraseStoreWithKeys[]> {
    try {
      // Get seed phrases for all available formats from TKeyStore
      const seedPhrases = await this.getSeedPhrases(tkey);
      return await Promise.all(
        seedPhrases.map(async (x) => {
          const suitableFormat = this.seedPhraseFormats.find((y) => y.type === x.type);
          const keys = await suitableFormat.deriveKeysFromSeedPhrase(x);
          return { ...x, keys };
        })
      );
    } catch (err) {
      return [];
    }
  }

  async getAccounts(tkey: ITKeyApi): Promise<BN[]> {
    try {
      // Get seed phrases for all available formats from TKeyStore
      const seedPhrases = (await tkey.getTKeyStore(this.moduleName)) as ISeedPhraseStore[];
      const responses = await Promise.all(
        seedPhrases.map(async (x) => {
          const suitableFormat = this.seedPhraseFormats.find((y) => y.type === x.type);
          return suitableFormat.deriveKeysFromSeedPhrase(x);
        })
      );
      return responses.flatMap((x) => x);
    } catch (err) {
      return [];
    }
  }
}

export default SeedPhraseModule;
