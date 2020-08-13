import BN from "bn.js";
import { IModule, IThresholdBak } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";
import ShareRequest from "./ShareRequest";
declare class ShareTransferModule implements IModule {
    moduleName: string;
    tbSDK: IThresholdBak;
    currentEncKey: BN;
    constructor();
    initialize(tbSDK: IThresholdBak): Promise<void>;
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
