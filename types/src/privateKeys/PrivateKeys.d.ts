import BN from "bn.js";
import { IModule, IPrivateKeyFormat, ITKeyApi } from "../baseTypes/aggregateTypes";
declare class PrivateKeyModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    privateKeyFormats: IPrivateKeyFormat[];
    constructor(formats: IPrivateKeyFormat[]);
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setPrivateKeys(privateKeys: BN[], privateKeyType: string): Promise<void>;
    getPrivateKeys(key: string): Promise<unknown>;
    getAccounts(): Promise<Array<BN>>;
}
export default PrivateKeyModule;
