/// <reference types="node" />
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
declare class TkeyModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    addSeedPhrase(seedPhrase: string): Promise<void>;
    getSeedPhraseStore(): Promise<Buffer>;
}
export default TkeyModule;
