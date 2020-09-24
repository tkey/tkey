import { IModule, ISubTkeyModule, ITKeyApi, TkeyStoreDataArgs } from "../../baseTypes/aggregateTypes";
declare class PrivateKeysModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    tkeyModule: ISubTkeyModule;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setPrivateKeys(privateKeys: Array<string>): Promise<void>;
    getPrivateKeys(): Promise<TkeyStoreDataArgs>;
}
export default PrivateKeysModule;
