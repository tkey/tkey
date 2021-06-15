import { BNString, IModule, ITKeyApi, ShareStore, StringifiedType } from "@tkey/common-types";
export declare const WEB_STORAGE_MODULE_NAME = "webStorage";
declare class WebStorageModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    canUseFileStorage: boolean;
    constructor(canUseFileStorage?: boolean);
    setFileStorageAccess(): Promise<void>;
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType): Promise<void>;
    storeDeviceShareOnFileStorage(shareIndex: BNString): Promise<void>;
    getDeviceShare(): Promise<ShareStore>;
    inputShareFromWebStorage(): Promise<void>;
}
export default WebStorageModule;
