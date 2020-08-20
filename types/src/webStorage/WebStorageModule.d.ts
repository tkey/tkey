import { ShareStore } from "../base";
import { IModule, IThresholdBakApi } from "../baseTypes/aggregateTypes";
declare class WebStorageModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBakApi;
    constructor();
    initialize(tbSDK: IThresholdBakApi): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    inputShareFromWebStorage(): Promise<void>;
}
export default WebStorageModule;
