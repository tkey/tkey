import { ISubTkeyModule, ITKeyApi, TkeyStoreDataArgs } from "../baseTypes/aggregateTypes";
declare class TkeyModule implements ISubTkeyModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setTKeyStore(data: unknown): Promise<void>;
    deleteKey(): Promise<void>;
    getTKeyStore(keys: Array<string>): Promise<TkeyStoreDataArgs>;
}
export default TkeyModule;
