import { IModule, ITKeyApi, ShareStore } from "@tkey/types";
import BN from "bn.js";
import ShareRequest from "./ShareRequest";
export declare type ShareTransferStore = {
  [encPubKeyX: string]: ShareRequest;
};
export declare const SHARE_TRANSFER_MODULE_NAME = "shareTransfer";
declare class ShareTransferModule implements IModule {
  moduleName: string;
  tbSDK: ITKeyApi;
  currentEncKey: BN;
  requestStatusCheckId: number;
  constructor();
  setModuleReferences(tbSDK: ITKeyApi): void;
  initialize(): Promise<void>;
  requestNewShare(userAgent: string, availableShareIndexes: Array<string>, callback?: (shareStore: ShareStore) => void): Promise<string>;
  lookForRequests(): Promise<Array<string>>;
  approveRequest(encPubKeyX: string, shareStore?: ShareStore): Promise<void>;
  approveRequestWithShareIndex(encPubKeyX: string, shareIndex: string): Promise<void>;
  getShareTransferStore(): Promise<ShareTransferStore>;
  setShareTransferStore(shareTransferStore: ShareTransferStore): Promise<void>;
  startRequestStatusCheck(encPubKeyX: string, deleteRequestAfterCompletion: boolean): Promise<ShareStore>;
  cancelRequestStatusCheck(): Promise<void>;
  deleteShareTransferStore(encPubKey: string): Promise<void>;
  resetShareTransferStore(): Promise<void>;
}
export default ShareTransferModule;
