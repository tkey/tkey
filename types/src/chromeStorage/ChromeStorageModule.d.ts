import { IModule, IThresholdBak } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";
export default class ChromeExtensionStorageModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBak;
    constructor();
    initialize(tbSDK: IThresholdBak): Promise<void>;
    storeDeviceShare(chrome: any, verifierId: string, deviceShareStore: ShareStore): Promise<void>;
    storeShareOnChromeExtensionStorage(chrome: any, verifierId: string, share: ShareStore): Promise<void>;
    getStoreFromChromeExtensionStorage(chrome: any, verifierId: string): Promise<ShareStore>;
    inputShareFromChromeExtensionStorage(chrome: any, verifierId: string, polyID: string): Promise<void>;
}
