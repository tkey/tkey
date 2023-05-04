import { ISeedPhraseFormat, ISeedPhraseStore, ISeedPhraseStoreWithKeys, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import SeedPhraseError from "./errors";

export const SEED_PHRASE_MODULE_NAME = "seedPhraseModule";

interface SeedPhraseModuleData {
  moduleName: string;
  seedPhraseFormats: ISeedPhraseFormat[];
}

class SeedPhraseModule {
  static setModuleReferences(tkey: ITKeyApi, data: SeedPhraseModuleData, moduleName = SEED_PHRASE_MODULE_NAME) {
    tkey.setModuleState<SeedPhraseModuleData>(data, moduleName);
    tkey._addReconstructKeyMiddlewareV2(moduleName, SeedPhraseModule.getAccounts);
  }

  static async setSeedPhrase(tkey: ITKeyApi, seedPhraseType: string, seedPhrase?: string, moduleName = SEED_PHRASE_MODULE_NAME): Promise<void> {
    const data = tkey.getModuleState<SeedPhraseModuleData>(moduleName);
    if (!data) throw new Error(`module "${moduleName}" not initalized`);

    const format = data.seedPhraseFormats.find((el) => el.type === seedPhraseType);
    if (!format) {
      throw SeedPhraseError.notSupported();
    }
    if (seedPhrase && !format.validateSeedPhrase(seedPhrase)) {
      throw SeedPhraseError.invalid(`${seedPhraseType}`);
    }
    const seedPhraseStore = await format.createSeedPhraseStore(seedPhrase);
    return tkey._setTKeyStoreItem(moduleName, seedPhraseStore);
  }

  static async setSeedPhraseStoreItem(tkey: ITKeyApi, partialStore: ISeedPhraseStore, moduleName = SEED_PHRASE_MODULE_NAME): Promise<void> {
    const data = tkey.getModuleState<SeedPhraseModuleData>(moduleName);
    if (!data) throw new Error(`module "${moduleName}" not initalized`);

    const seedPhraseItem = (await tkey.getTKeyStoreItem(moduleName, partialStore.id)) as ISeedPhraseStore;
    const originalItem: ISeedPhraseStore = { id: seedPhraseItem.id, type: seedPhraseItem.type, seedPhrase: seedPhraseItem.seedPhrase };
    // Disallow editing critical fields
    const finalItem = { ...partialStore, ...originalItem };
    return tkey._setTKeyStoreItem(moduleName, finalItem);
  }

  static async CRITICAL_changeSeedPhrase(
    tkey: ITKeyApi,
    oldSeedPhrase: string,
    newSeedPhrase: string,
    moduleName = SEED_PHRASE_MODULE_NAME
  ): Promise<void> {
    const data = tkey.getModuleState<SeedPhraseModuleData>(moduleName);
    if (!data) throw new Error(`module "${moduleName}" not initalized`);
    const seedPhrases = await SeedPhraseModule.getSeedPhrases(tkey, moduleName);
    const itemToChange = seedPhrases.find((x) => x.seedPhrase === oldSeedPhrase);
    itemToChange.seedPhrase = newSeedPhrase;
    return tkey._setTKeyStoreItem(moduleName, itemToChange);
  }

  static async getSeedPhrases(tkey: ITKeyApi, moduleName = SEED_PHRASE_MODULE_NAME): Promise<ISeedPhraseStore[]> {
    const data = tkey.getModuleState<SeedPhraseModuleData>(moduleName);
    if (!data) throw new Error(`module "${moduleName}" not initalized`);
    return tkey.getTKeyStore(moduleName) as Promise<ISeedPhraseStore[]>;
  }

  static async getSeedPhrasesWithAccounts(tkey: ITKeyApi, moduleName = SEED_PHRASE_MODULE_NAME): Promise<ISeedPhraseStoreWithKeys[]> {
    const data = tkey.getModuleState<SeedPhraseModuleData>(moduleName);
    if (!data) throw new Error(`module "${moduleName}" not initalized`);
    try {
      // Get seed phrases for all available formats from TKeyStore
      const seedPhrases = await this.getSeedPhrases(tkey, moduleName);
      return await Promise.all(
        seedPhrases.map(async (x) => {
          const suitableFormat = data.seedPhraseFormats.find((y) => y.type === x.type);
          const keys = await suitableFormat.deriveKeysFromSeedPhrase(x);
          return { ...x, keys };
        })
      );
    } catch (err) {
      return [];
    }
  }

  static async getAccounts(tkey: ITKeyApi, moduleName = SEED_PHRASE_MODULE_NAME): Promise<BN[]> {
    const data = tkey.getModuleState<SeedPhraseModuleData>(moduleName);
    if (!data) throw new Error(`module "${moduleName}" not initalized`);
    try {
      // Get seed phrases for all available formats from TKeyStore
      const seedPhrases = await SeedPhraseModule.getSeedPhrases(tkey, moduleName);
      const responses = await Promise.all(
        seedPhrases.map(async (x) => {
          const suitableFormat = data.seedPhraseFormats.find((y) => y.type === x.type);
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
