import { IModule, IThresholdBak } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";
export default class ChromeExtensionStorageModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBak;
    constructor();
    initialize(tbSDK: IThresholdBak): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    storeShareOnChromeExtensionStorage(share: ShareStore): Promise<void>;
    getStoreFromChromeExtensionStorage(): Promise<ShareStore>;
    inputShareFromChromeExtensionStorage(): Promise<void>;
}
