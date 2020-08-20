import { ShareStore } from "../base";
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
export default class ChromeExtensionStorageModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    initialize(tbSDK: ITKeyApi): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    storeShareOnChromeExtensionStorage(share: ShareStore): Promise<void>;
    getStoreFromChromeExtensionStorage(): Promise<ShareStore>;
    inputShareFromChromeExtensionStorage(): Promise<void>;
}
