import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "@tkey/types";
import BN from "bn.js";
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
