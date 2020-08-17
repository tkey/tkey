import { IModule, IThresholdBakApi } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";
declare global {
    interface Navigator {
        webkitPersistentStorage: {
            requestQuota: (a: any, b: (grantedBytes: number) => void, c: any) => unknown;
        };
    }
}
declare class WebStorageModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBakApi;
    constructor();
    initialize(tbSDK: IThresholdBakApi): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    inputShareFromWebStorage(): Promise<void>;
    getShareFromChromeFileStorage(polyID: string): Promise<ShareStore>;
    getShareFromLocalStorage(polyID: string): Promise<ShareStore>;
    storeShareOnFileStorage(share: ShareStore): Promise<void>;
    storeShareOnLocalStorage(share: ShareStore): Promise<void>;
}
export default WebStorageModule;
