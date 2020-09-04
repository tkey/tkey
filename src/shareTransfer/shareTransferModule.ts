import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import { getPubKeyECC, getPubKeyPoint, ShareStore, toPrivKeyECC } from "../base";
import { IModule, ITKeyApi, ShareTransferStorePointerArgs } from "../baseTypes/aggregateTypes";
import { decrypt, encrypt } from "../utils";
import ShareRequest from "./ShareRequest";
import ShareTransferStorePointer from "./ShareTransferStorePointer";

// @flow
export type ShareTransferStore = {
  [encPubKeyX: string]: ShareRequest;
};

class ShareTransferModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  currentEncKey: BN;

  constructor() {
    this.moduleName = "shareTransfer";
  }

  async initialize(tbSdk: ITKeyApi): Promise<void> {
    //   this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
    this.tbSDK = tbSdk;
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
    if (this.currentEncKey) throw new Error(`Current request already exists ${this.currentEncKey.toString("hex")}`);
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
        const receivedShare = ShareStore.fromJSON(JSON.parse(shareStoreBuf.toString()));
        await this.tbSDK.inputShareSafe(receivedShare);
        if (callback) callback(receivedShare);
        clearInterval(timerID);
      }
    }, 1000);
    return encPubKeyX;
  }

  async lookForRequests(): Promise<Array<string>> {
    const shareTransferStore = await this.getShareTransferStore();
    return Object.keys(shareTransferStore);
  }

  async approveRequest(encPubKeyX: string, shareStore: ShareStore): Promise<void> {
    const shareTransferStore = await this.getShareTransferStore();
    const bufferedShare = Buffer.from(JSON.stringify(shareStore));
    const shareRequest = new ShareRequest(shareTransferStore[encPubKeyX]);
    shareTransferStore[encPubKeyX].encShareInTransit = await encrypt(shareRequest.encPubKey, bufferedShare);
    await this.setShareTransferStore(shareTransferStore);
  }

  async getShareTransferStore(): Promise<ShareTransferStore> {
    const shareTransferStorePointer = new ShareTransferStorePointer(
      this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs
    );
    const value = await this.tbSDK.storageLayer.getMetadata(shareTransferStorePointer.pointer);
    return value as ShareTransferStore;
  }

  async setShareTransferStore(shareTransferStore: ShareTransferStore): Promise<void> {
    const shareTransferStorePointer = new ShareTransferStorePointer(
      this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs
    );
    await this.tbSDK.storageLayer.setMetadata(shareTransferStore, shareTransferStorePointer.pointer);
  }
}

export default ShareTransferModule;
