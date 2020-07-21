import { IModule, IThresholdBak } from "../base/aggregateTypes";
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
    tbSDK: IThresholdBak;
    constructor();
    initialize(tbSDK: IThresholdBak): void;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    storeShareOnFileStorage(share: ShareStore): Promise<void>;
    storeShareOnLocalStorage(share: ShareStore): Promise<void>;
}
export default WebStorageModule;
