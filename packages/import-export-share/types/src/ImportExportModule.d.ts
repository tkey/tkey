import { IModule, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";
export declare const IMPORT_EXPORT_MODULE_NAME = "importExportModule";
declare class ImportExportModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    english: string[];
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    shareToMnemonic(share: BN): string;
    mnemonicToShare(seed: string): BN;
}
export default ImportExportModule;
