import { IModule, IPrivateKeyFormat, IPrivateKeyStore, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";
export declare const PRIVATE_KEY_MODULE_NAME = "privateKeyModule";
declare class PrivateKeyModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    privateKeyFormats: IPrivateKeyFormat[];
    constructor(formats: IPrivateKeyFormat[]);
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    setPrivateKey(privateKey: BN, privateKeyType: string): Promise<void>;
    getPrivateKeys(): Promise<IPrivateKeyStore[]>;
    getAccounts(): Promise<BN[]>;
}
export default PrivateKeyModule;
