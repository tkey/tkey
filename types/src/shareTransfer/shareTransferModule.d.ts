import BN from "bn.js";
import { ShareStore } from "../base";
import { IModule, IThresholdBakApi } from "../baseTypes/aggregateTypes";
import ShareRequest from "./ShareRequest";
declare class ShareTransferModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBakApi;
    currentEncKey: BN;
    constructor();
    initialize(tbSdk: IThresholdBakApi): Promise<void>;
    requestNewShare(callback: (shareStore: ShareStore) => void): Promise<string>;
    lookForRequests(): Promise<Array<string>>;
    approveRequest(encPubKeyX: string, shareStore: ShareStore): Promise<void>;
    getShareTransferStore(): Promise<ShareTransferStore>;
    setShareTransferStore(shareTransferStore: ShareTransferStore): Promise<void>;
}
export declare type ShareTransferStore = {
    [encPubKeyX: string]: ShareRequest;
};
export default ShareTransferModule;
