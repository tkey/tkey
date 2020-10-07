import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";
export declare const SEED_PHRASE_MODULE_NAME = "seedPhraseModule";
declare class SeedPhraseModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    seedPhraseFormats: ISeedPhraseFormat[];
    constructor(formats: ISeedPhraseFormat[]);
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setSeedPhrase(seedPhrase: string, seedPhraseType: string): Promise<void>;
    getSeedPhrase(key: string): Promise<ISeedPhraseStore>;
    getAccounts(): Promise<Array<BN>>;
}
export default SeedPhraseModule;
