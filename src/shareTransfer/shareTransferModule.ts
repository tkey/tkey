import BN from "bn.js";
// eslint-disable-next-line import/no-unresolved
import { generatePrivate } from "eccrypto";

import { IModule, IThresholdBak, ShareTransferStorePointerArgs } from "../base/aggregateTypes";
import { getPubKeyECC } from "../base/BNUtils";
import { EncryptedMessage } from "../base/commonTypes";
import { encrypt } from "../utils";
import ShareTransferStorePointer from "./ShareTransferStorePointer";

class ShareTransferModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  currentEncKey: BN;

  constructor() {
    this.moduleName = "shareTransfer";
  }

  initialize(tbSDK: IThresholdBak): void {
    this.tbSDK = tbSDK;
    //   this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
  }

  async requestNewShare(sharedShare: BN): Promise<string> {
    if (this.currentEncKey) throw Error(`Current request already exists ${this.currentEncKey.toString("hex")}`);
    this.currentEncKey = new BN(generatePrivate());
    const shareTransferStore = await this.getShareTransferStore();

    let newShareTransferStore;
    if (shareTransferStore) {
      newShareTransferStore = shareTransferStore;
    } else {
      newShareTransferStore = {};
    }
    newShareTransferStore[this.currentEncKey.toString("hex")] = { encPubKey: getPubKeyECC(this.currentEncKey) } as ShareRequest;
    this.tbSDK.metadata.setGeneralStoreDomain(this.moduleName, newShareTransferStore);
    this.tbSDK.syncSingleShareMetadata(sharedShare);
    return getPubKeyECC(this.currentEncKey).toString();
  }

  async lookForRequests(): Promise<Array<string>> {
    const shareTransferStore = await this.getShareTransferStore();
    return Object.keys(shareTransferStore);
  }

  async approveRequest(encPubKeyX: string): Promise<void> {
    const shareTransferStore = await this.getShareTransferStore();
    const result = await this.tbSDK.generateNewShare();
    const bufferedShare = Buffer.from(JSON.stringify(result.newShareStores[result.newShareIndex.toString("hex")]));
    shareTransferStore[encPubKeyX].encShareInTransit = await encrypt(shareTransferStore[encPubKeyX].encPubKey, bufferedShare);
    this.setShareTransferStore(shareTransferStore);
  }

  async getShareTransferStore(): Promise<ShareTransferStore> {
    const shareTransferStorePointer = new ShareTransferStorePointer(
      this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs
    );
    return (await this.tbSDK.storageLayer.getMetadata(shareTransferStorePointer.pointer)) as ShareTransferStore;
  }

  async setShareTransferStore(shareTransferStore: ShareTransferStore): Promise<void> {
    const shareTransferStorePointer = new ShareTransferStorePointer(
      this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs
    );
    this.tbSDK.storageLayer.setMetadata(shareTransferStore, shareTransferStorePointer.pointer);
  }
}

export type ShareRequest = {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;
};

// @flow
export type ShareTransferStore = {
  [encPubKeyX: string]: ShareRequest;
};

export default ShareTransferModule;
