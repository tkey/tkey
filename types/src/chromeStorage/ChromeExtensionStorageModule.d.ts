import { IModule, IThresholdBakApi } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";
export default class ChromeExtensionStorageModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBakApi;
    constructor();
    initialize(tbSDK: IThresholdBakApi): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    storeShareOnChromeExtensionStorage(share: ShareStore): Promise<void>;
    getStoreFromChromeExtensionStorage(): Promise<ShareStore>;
    inputShareFromChromeExtensionStorage(): Promise<void>;
}
