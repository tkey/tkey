import {
  decrypt,
  encrypt,
  getPubKeyECC,
  getPubKeyPoint,
  IModule,
  ITkeyError,
  ShareStore,
  ShareStoreMap,
  ShareTransferStorePointerArgs,
  TkeyStatus,
  toPrivKeyECC,
} from "@tkey/common-types";
import type Threshold from "@tkey/core";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import ShareTransferError from "./errors";
import ShareRequest from "./ShareRequest";
import ShareTransferStorePointer from "./ShareTransferStorePointer";
import { getClientIp } from "./utils";

export type ShareTransferStore = {
  [encPubKeyX: string]: ShareRequest;
};

export const SHARE_TRANSFER_MODULE_NAME = "shareTransfer";

class ShareTransferModule implements IModule {
  moduleName: string;

  currentEncKey: BN;

  requestStatusCheckId: number;

  requestStatusCheckInterval: number;

  constructor() {
    this.moduleName = SHARE_TRANSFER_MODULE_NAME;
    this.requestStatusCheckInterval = 1000;
  }

  static refreshShareTransferMiddleware(
    generalStore: unknown,
    oldShareStores: ShareStoreMap,
    newShareStores: ShareStoreMap
  ): ShareTransferStorePointer {
    const numberOfOldShares = Object.keys(oldShareStores).length;
    const numberOfNewShares = Object.keys(newShareStores).length;

    // This is needed to avoid MIM during share deletion.
    if (numberOfNewShares <= numberOfOldShares) {
      const shareTransferStorePointer: ShareTransferStorePointer = { pointer: new BN(generatePrivate()) };
      return shareTransferStorePointer;
    }

    return generalStore as ShareTransferStorePointer;
  }

  setModuleReferences(tkey: Threshold): void {
    tkey._addRefreshMiddleware(this.moduleName, ShareTransferModule.refreshShareTransferMiddleware);
  }

  setRequestStatusCheckInterval(interval: number): void {
    this.requestStatusCheckInterval = interval;
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  async enable(tkey: Threshold): Promise<void> {
    const metadata = tkey.getMetadata();
    const rawShareTransferStorePointer = metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs;
    let shareTransferStorePointer: ShareTransferStorePointer;
    if (!rawShareTransferStorePointer) {
      shareTransferStorePointer = { pointer: new BN(generatePrivate()) };
      metadata.setGeneralStoreDomain(this.moduleName, shareTransferStorePointer);
      // await this.tbSDK.syncShareMetadata(); // Requires threshold shares
      // OPTIMIZATION TO NOT SYNC METADATA TWICE ON INIT, WILL FAIL IF TKEY DOES NOT HAVE MODULE AS DEFAULT
    } else {
      // shareTransferStorePointer = new ShareTransferStorePointer(rawShareTransferStorePointer);
      throw Error("Enabled");
    }
    this.setModuleReferences(tkey);
    // will add to localmetadata transistion if manual sync is true
    await tkey._syncShareMetadata();
    // sync localmetadata if it is not manual sync
    if (!tkey.manualSync) await tkey.syncLocalMetadataTransitions();
  }

  async setup(tkey: Threshold): Promise<void> {
    const metadata = tkey.getMetadata();
    const rawShareTransferStorePointer = metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs;
    if (!rawShareTransferStorePointer) {
      const status = tkey.getTkeyStatus();
      if (status === TkeyStatus.RECONSTRUCTED) {
        await this.enable(tkey);
      } else {
        throw new Error("Share Transfer is not enabled");
      }
    }
    this.setModuleReferences(tkey);
  }

  async requestNewShare(
    tkey: Threshold,
    userAgent: string,
    availableShareIndexes: Array<string>,
    callback?: (err?: ITkeyError, shareStore?: ShareStore) => void
  ): Promise<string> {
    if (this.currentEncKey) throw ShareTransferError.requestExists(`${this.currentEncKey.toString("hex")}`);
    this.currentEncKey = new BN(generatePrivate());
    const [newShareTransferStore, userIp] = await Promise.all([this.getShareTransferStore(tkey), getClientIp()]);
    const encPubKeyX = getPubKeyPoint(this.currentEncKey).x.toString("hex");
    newShareTransferStore[encPubKeyX] = new ShareRequest({
      encPubKey: getPubKeyECC(this.currentEncKey),
      encShareInTransit: undefined,
      availableShareIndexes,
      userAgent,
      userIp,
      timestamp: Date.now(),
    });
    await this.setShareTransferStore(tkey, newShareTransferStore);
    // watcher
    if (callback) {
      this.requestStatusCheckId = Number(
        setInterval(async () => {
          try {
            const latestShareTransferStore = await this.getShareTransferStore(tkey);
            if (!this.currentEncKey) throw ShareTransferError.missingEncryptionKey();
            if (latestShareTransferStore[encPubKeyX].encShareInTransit) {
              const shareStoreBuf = await decrypt(toPrivKeyECC(this.currentEncKey), latestShareTransferStore[encPubKeyX].encShareInTransit);
              const receivedShare = ShareStore.fromJSON(JSON.parse(shareStoreBuf.toString()));
              await tkey.inputShareStoreSafe(receivedShare, true);
              this._cleanUpCurrentRequest();
              callback(null, receivedShare);
            } else if (!latestShareTransferStore[encPubKeyX]) {
              this._cleanUpCurrentRequest();
              callback(ShareTransferError.userCancelledRequest());
            }
          } catch (error) {
            this._cleanUpCurrentRequest();
            callback(error);
          }
        }, this.requestStatusCheckInterval)
      );
    }
    return encPubKeyX;
  }

  async addCustomInfoToShareRequest(tkey: Threshold, encPubKeyX: string, customInfo: string): Promise<void> {
    const shareTransferStore = await this.getShareTransferStore(tkey);
    if (!shareTransferStore[encPubKeyX]) throw ShareTransferError.missingEncryptionKey();
    shareTransferStore[encPubKeyX].customInfo = customInfo;
    await this.setShareTransferStore(tkey, shareTransferStore);
  }

  async lookForRequests(tkey: Threshold): Promise<Array<string>> {
    const shareTransferStore = await this.getShareTransferStore(tkey);
    return Object.keys(shareTransferStore);
  }

  async approveRequest(tkey: Threshold, encPubKeyX: string, shareStore?: ShareStore): Promise<void> {
    const shareTransferStore = await this.getShareTransferStore(tkey);
    if (!shareTransferStore[encPubKeyX]) throw ShareTransferError.missingEncryptionKey();

    let bufferedShare: Buffer;
    if (shareStore) {
      bufferedShare = Buffer.from(JSON.stringify(shareStore));
    } else {
      const store = new ShareRequest(shareTransferStore[encPubKeyX]);
      const { availableShareIndexes } = store;
      const metadata = tkey.getMetadata();
      const latestPolynomial = metadata.getLatestPublicPolynomial();
      const latestPolynomialId = latestPolynomial.getPolynomialID();
      const indexes = metadata.getShareIndexesForPolynomial(latestPolynomialId);
      const filtered = indexes.filter((el) => !availableShareIndexes.includes(el));
      const share = tkey.outputShareStore(filtered[0]);
      bufferedShare = Buffer.from(JSON.stringify(share));
    }
    const shareRequest = new ShareRequest(shareTransferStore[encPubKeyX]);
    shareTransferStore[encPubKeyX].encShareInTransit = await encrypt(shareRequest.encPubKey, bufferedShare);
    await this.setShareTransferStore(tkey, shareTransferStore);
    this.currentEncKey = undefined;
  }

  async approveRequestWithShareIndex(tkey: Threshold, encPubKeyX: string, shareIndex: string): Promise<void> {
    const deviceShare = tkey.outputShareStore(shareIndex);
    return this.approveRequest(tkey, encPubKeyX, deviceShare);
  }

  async getShareTransferStore(tkey: Threshold): Promise<ShareTransferStore> {
    const metadata = tkey.getMetadata();
    const shareTransferStorePointer = new ShareTransferStorePointer(metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs);
    const storageLayer = tkey.getStorageLayer();
    return storageLayer.getMetadata<ShareTransferStore>({ privKey: shareTransferStorePointer.pointer });
  }

  async setShareTransferStore(tkey: Threshold, shareTransferStore: ShareTransferStore): Promise<void> {
    const metadata = tkey.getMetadata();
    const shareTransferStorePointer = new ShareTransferStorePointer(metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStorePointerArgs);
    const storageLayer = tkey.getStorageLayer();
    await storageLayer.setMetadata({ input: shareTransferStore, privKey: shareTransferStorePointer.pointer });
  }

  async startRequestStatusCheck(tkey: Threshold, encPubKeyX: string, deleteRequestAfterCompletion: boolean): Promise<ShareStore> {
    // watcher
    return new Promise((resolve, reject) => {
      this.requestStatusCheckId = Number(
        setInterval(async () => {
          try {
            const latestShareTransferStore = await this.getShareTransferStore(tkey);
            if (!this.currentEncKey) throw ShareTransferError.missingEncryptionKey();
            if (!latestShareTransferStore[encPubKeyX]) {
              this._cleanUpCurrentRequest();
              reject(ShareTransferError.userCancelledRequest());
            } else if (latestShareTransferStore[encPubKeyX].encShareInTransit) {
              const shareStoreBuf = await decrypt(toPrivKeyECC(this.currentEncKey), latestShareTransferStore[encPubKeyX].encShareInTransit);
              const receivedShare = ShareStore.fromJSON(JSON.parse(shareStoreBuf.toString()));
              await tkey.inputShareStoreSafe(receivedShare, true);
              if (deleteRequestAfterCompletion) {
                await this.deleteShareTransferStore(tkey, encPubKeyX);
              }
              this._cleanUpCurrentRequest();
              resolve(receivedShare);
            }
          } catch (err) {
            this._cleanUpCurrentRequest();
            reject(err);
          }
        }, this.requestStatusCheckInterval)
      );
    });
  }

  async cancelRequestStatusCheck(): Promise<void> {
    clearInterval(this.requestStatusCheckId);
  }

  async deleteShareTransferStore(tkey: Threshold, encPubKey: string): Promise<void> {
    const currentShareTransferStore = await this.getShareTransferStore(tkey);
    delete currentShareTransferStore[encPubKey];
    await this.setShareTransferStore(tkey, currentShareTransferStore);
  }

  async resetShareTransferStore(tkey: Threshold): Promise<void> {
    const metadata = tkey.getMetadata();
    const shareTransferStorePointer = { pointer: new BN(generatePrivate()) };
    metadata.setGeneralStoreDomain(this.moduleName, shareTransferStorePointer);
    await tkey._syncShareMetadata();
  }

  private _cleanUpCurrentRequest(): void {
    this.currentEncKey = undefined;
    clearInterval(this.requestStatusCheckId);
  }
}

export default ShareTransferModule;
