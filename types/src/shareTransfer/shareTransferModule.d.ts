import BN from "bn.js";
import { ShareStore } from "../base";
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
import ShareRequest from "./ShareRequest";
export declare type ShareTransferStore = {
    [encPubKeyX: string]: ShareRequest;
};
declare class ShareTransferModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    currentEncKey: BN;
    constructor();
    initialize(tbSdk: ITKeyApi): Promise<void>;
    requestNewShare(callback: (shareStore: ShareStore) => void): Promise<string>;
    lookForRequests(): Promise<Array<string>>;
    approveRequest(encPubKeyX: string, shareStore: ShareStore): Promise<void>;
    getShareTransferStore(): Promise<ShareTransferStore>;
    setShareTransferStore(shareTransferStore: ShareTransferStore): Promise<void>;
}
export default ShareTransferModule;
