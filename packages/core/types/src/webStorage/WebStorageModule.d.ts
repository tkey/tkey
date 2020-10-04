import { BNString, IModule, ITKeyApi, ShareStore } from "@tkey/types";
declare class WebStorageModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    canUseChromeStorage: boolean;
    constructor(canUseChromeStorage?: boolean);
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    storeDeviceShareOnFileStorage(shareIndex: BNString): Promise<void>;
    getDeviceShare(): Promise<ShareStore>;
    inputShareFromWebStorage(): Promise<void>;
}
export default WebStorageModule;