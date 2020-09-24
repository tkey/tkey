import BN from "bn.js";
import { IModule, ISeedPhraseFormat, ISeedPhraseStore, ITKeyApi } from "../../baseTypes/aggregateTypes";
declare class SeedPhraseModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    seedPhraseFormats: Array<ISeedPhraseFormat>;
    constructor(formats: Array<ISeedPhraseFormat>);
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setSeedPhrase(seedPhrase: string, seedPhraseType: string): Promise<void>;
    getSeedPhrase(): Promise<ISeedPhraseStore>;
    getAccounts(): Promise<Array<BN>>;
}
export default SeedPhraseModule;
