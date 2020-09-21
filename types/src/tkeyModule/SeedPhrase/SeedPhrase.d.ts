import { IModule, ISubTkeyModule, ITKeyApi, TkeyStoreDataArgs } from "../../baseTypes/aggregateTypes";
declare class SeedPhraseModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    tkeyModule: ISubTkeyModule;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setSeedPhrase(seedPhrase: string): Promise<void>;
    getSeedPhrase(): Promise<TkeyStoreDataArgs>;
    getAccounts(numberOfAccounts?: number): Promise<Array<string>>;
}
export default SeedPhraseModule;
