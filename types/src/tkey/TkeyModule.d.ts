import { IModule, ITKeyApi, TkeyStoreDataArgs } from "../baseTypes/aggregateTypes";
declare class TkeyModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    addData(data: unknown): Promise<void>;
    deleteKey(): Promise<void>;
    getData(): Promise<TkeyStoreDataArgs>;
}
export default TkeyModule;
