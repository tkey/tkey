import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import { IModule, IThresholdBak, ShareTransferStorePointerArgs } from "../base/aggregateTypes";
import { getPubKeyECC, getPubKeyPoint, toPrivKeyECC } from "../base/BNUtils";
import ShareStore from "../base/ShareStore";
import { decrypt, encrypt } from "../utils";
import ShareRequest from "./ShareRequest";
import ShareTransferStorePointer from "./ShareTransferStorePointer";

class ShareTransferModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  currentEncKey: BN;

  constructor() {
    this.moduleName = "shareTransfer";
  }

  async initialize(tbSDK: IThresholdBak): Promise<void> {
    this.tbSDK = tbSDK;
    //   this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));

    const rawShareTransferStorePointer = this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs;
    let shareTransferStorePointer;
    if (!rawShareTransferStorePointer) {
      shareTransferStorePointer = { pointer: new BN(generatePrivate()) };
      this.tbSDK.metadata.setGeneralStoreDomain(this.moduleName, shareTransferStorePointer);
      await this.tbSDK.syncShareMetadata();
    } else {
      shareTransferStorePointer = new ShareTransferStorePointer(rawShareTransferStorePointer);
    }
  }

  async requestNewShare(callback: (shareStore: ShareStore) => void): Promise<string> {
    if (this.currentEncKey) throw Error(`Current request already exists ${this.currentEncKey.toString("hex")}`);
    this.currentEncKey = new BN(generatePrivate());
    let newShareTransferStore;
    const shareTransferStore = await this.getShareTransferStore();
    if (shareTransferStore) {
      newShareTransferStore = shareTransferStore;
    } else {
      newShareTransferStore = {};
    }
    const encPubKeyX = getPubKeyPoint(this.currentEncKey).x.toString("hex");
    newShareTransferStore[encPubKeyX] = new ShareRequest({ encPubKey: getPubKeyECC(this.currentEncKey), encShareInTransit: undefined });
    await this.setShareTransferStore(newShareTransferStore);
    // watcher
    const timerID = setInterval(async () => {
      const latestShareTransferStore = await this.getShareTransferStore();
      if (latestShareTransferStore[encPubKeyX].encShareInTransit) {
        const shareStoreBuf = await decrypt(toPrivKeyECC(this.currentEncKey), latestShareTransferStore[encPubKeyX].encShareInTransit);
        callback(new ShareStore(JSON.parse(shareStoreBuf.toString())));
        clearInterval(timerID);
      }
    }, 6000);
    return encPubKeyX;
  }

  async lookForRequests(): Promise<Array<string>> {
    const shareTransferStore = await this.getShareTransferStore();
    return Object.keys(shareTransferStore);
  }

  async approveRequest(encPubKeyX: string): Promise<void> {
    const shareTransferStore = await this.getShareTransferStore();
    const result = await this.tbSDK.generateNewShare();
    const bufferedShare = Buffer.from(JSON.stringify(result.newShareStores[result.newShareIndex.toString("hex")]));
    const shareRequest = new ShareRequest(shareTransferStore[encPubKeyX]);
    shareTransferStore[encPubKeyX].encShareInTransit = await encrypt(shareRequest.encPubKey, bufferedShare);
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

// @flow
export type ShareTransferStore = {
  [encPubKeyX: string]: ShareRequest;
};

export default ShareTransferModule;
