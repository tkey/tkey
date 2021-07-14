import { IModule, ITKeyApi, ShareStore, StringifiedType } from "@tkey/common-types";
export declare const CHROME_EXTENSION_STORAGE_MODULE_NAME = "chromeExtensionStorage";
export default class ChromeExtensionStorageModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType): Promise<void>;
    storeShareOnChromeExtensionStorage(share: ShareStore): Promise<void>;
    getStoreFromChromeExtensionStorage(): Promise<ShareStore>;
    inputShareFromChromeExtensionStorage(): Promise<void>;
}
