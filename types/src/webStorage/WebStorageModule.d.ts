import { ShareStore } from "../base";
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
declare class WebStorageModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    initialize(tbSDK: ITKeyApi): Promise<void>;
    storeDeviceShare(deviceShareStore: ShareStore): Promise<void>;
    inputShareFromWebStorage(): Promise<void>;
}
export default WebStorageModule;
