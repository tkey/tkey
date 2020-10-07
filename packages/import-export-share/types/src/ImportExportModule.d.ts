/// <reference types="node" />
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
    entropyToMnemonic(entropy: Buffer | string): string;
    mnemonicToEntropy(mnemonic: string): string;
    exportShare(share: BN): string;
}
export default ImportExportModule;
