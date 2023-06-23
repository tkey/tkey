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
  toPrivKeyEC,
  toPrivKeyECC,
} from "@tkey/common-types";
import type Threshold from "@tkey/core";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import ShareTransferError from "./errors";
import ShareRequest, { AuthShareRequest } from "./ShareRequest";
import ShareTransferStorePointer from "./ShareTransferStorePointer";
import { getClientIp } from "./utils";

export type ShareTransferStore = {
  [encPubKeyX: string]: AuthShareRequest;
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
    const shareRequest = new ShareRequest({
      encPubKey: getPubKeyECC(this.currentEncKey),
      encShareInTransit: undefined,
      availableShareIndexes,
      userAgent,
      userIp,
      timestamp: Date.now(),
    });

    const authRequest = new AuthShareRequest(shareRequest);

    // pick available share from latest poly and sign using it
    const latestPolyId = tkey.metadata.polyIDList.at(-1)[0];
    const { share } = Object.values(tkey.shares[latestPolyId])[0].share;
    newShareTransferStore[encPubKeyX] = await authRequest.sign(share.toString("hex"));

    await this.setShareTransferStore(tkey, newShareTransferStore);
    // watcher
    if (callback) {
      this.requestStatusCheckId = Number(
        setInterval(async () => {
          try {
            const receivedShare = await this.checkForApprovedRequest(tkey, encPubKeyX, true);
            callback(null, receivedShare);
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
    // validation
    if (!shareTransferStore[encPubKeyX]) throw ShareTransferError.missingEncryptionKey();
    const receivedAuthRequest = AuthShareRequest.fromJSON(shareTransferStore[encPubKeyX]);
    if (!receivedAuthRequest) throw ShareTransferError.missingEncryptionKey();
    const store = await receivedAuthRequest.getVerifiedShareRequest();
    const requestedBy = await this.validateRequest(tkey, encPubKeyX);

    // update
    store.customInfo = customInfo;

    // sign and sync to metadata server
    const authReq = new AuthShareRequest(store);
    const signedReq = await authReq.sign(requestedBy.share.share.toString("hex"));

    const updatedShareTransferStore = { ...shareTransferStore, [encPubKeyX]: signedReq };
    await this.setShareTransferStore(tkey, updatedShareTransferStore);
  }

  async lookForRequests(tkey: Threshold): Promise<Array<string>> {
    const shareTransferStore = await this.getShareTransferStore(tkey);
    return Object.keys(shareTransferStore);
  }

  // Validation is needed before approve to prevent request from unknown share or deleted share
  // DO NOT refresh share (generate new share) before validate. refresh share before validation will cause the share transfer request to fail
  async validateRequest(tkey: Threshold, encPubKeyX: string) {
    const shareTransferStore = await this.getShareTransferStore(tkey);
    const receivedAuthRequest = AuthShareRequest.fromJSON(shareTransferStore[encPubKeyX]);

    // check if request signer is in latest poly
    const latestShareStore = tkey.getAllShareStoresForLatestPolynomial();
    const requestedBy = latestShareStore.find((item) => {
      return toPrivKeyEC(item.share.share).getPublic().encodeCompressed("hex") === receivedAuthRequest.commitment;
    });
    if (!requestedBy) throw new Error("Share Transfer attempt from unknown share");
    return requestedBy;
  }

  async approveRequest(tkey: Threshold, encPubKeyX: string, shareStore?: ShareStore): Promise<void> {
    const shareTransferStore = await this.getShareTransferStore(tkey);
    const receivedAuthRequest = AuthShareRequest.fromJSON(shareTransferStore[encPubKeyX]);

    if (!receivedAuthRequest) throw ShareTransferError.missingEncryptionKey();
    const store = await receivedAuthRequest.getVerifiedShareRequest();

    const requestedBy = await this.validateRequest(tkey, encPubKeyX);

    // get to be transfered share store
    let bufferedShare: Buffer;
    if (shareStore) {
      bufferedShare = Buffer.from(JSON.stringify(shareStore));
    } else if (store.availableShareIndexes) {
      const { availableShareIndexes } = store;
      const metadata = tkey.getMetadata();
      const latestPolynomial = metadata.getLatestPublicPolynomial();
      const latestPolynomialId = latestPolynomial.getPolynomialID();
      const indexes = metadata.getShareIndexesForPolynomial(latestPolynomialId);
      const filtered = indexes.filter((el) => !availableShareIndexes.includes(el));
      const share = tkey.outputShareStore(filtered[0]);
      bufferedShare = Buffer.from(JSON.stringify(share));
    } else {
      const newShareDetails = await tkey.generateNewShare();
      const newShare = newShareDetails.newShareStores[newShareDetails.newShareIndex.toString("hex")];
      bufferedShare = Buffer.from(JSON.stringify(newShare));
    }
    // encrypt share and update store
    store.encShareInTransit = await encrypt(store.encPubKey, bufferedShare);

    // sign and sync to metadata server
    const authReq = new AuthShareRequest(store);
    const signedReq = await authReq.sign(requestedBy.share.share.toString("hex"));

    const updatedShareTransferStore = { ...shareTransferStore, [encPubKeyX]: signedReq };
    await this.setShareTransferStore(tkey, updatedShareTransferStore);

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
            const receivedShare = await this.checkForApprovedRequest(tkey, encPubKeyX, deleteRequestAfterCompletion);
            resolve(receivedShare);
          } catch (err) {
            this._cleanUpCurrentRequest();
            reject(err);
          }
        }, this.requestStatusCheckInterval)
      );
    });
  }

  async checkForApprovedRequest(tkey: Threshold, encPubKeyX: string, deleteRequestAfterCompletion: boolean): Promise<ShareStore> {
    const latestShareTransferStore = await this.getShareTransferStore(tkey);
    const authRequest = AuthShareRequest.fromJSON(latestShareTransferStore[encPubKeyX]);
    const shareRequest = await authRequest.getVerifiedShareRequest();

    if (!this.currentEncKey) throw ShareTransferError.missingEncryptionKey();
    if (!authRequest) {
      this._cleanUpCurrentRequest();
      throw ShareTransferError.userCancelledRequest();
    } else if (shareRequest.encShareInTransit) {
      const shareStoreBuf = await decrypt(toPrivKeyECC(this.currentEncKey), shareRequest.encShareInTransit);
      const receivedShare = ShareStore.fromJSON(JSON.parse(shareStoreBuf.toString()));
      await tkey.inputShareStoreSafe(receivedShare, true);
      if (deleteRequestAfterCompletion) {
        await this.deleteShareTransferStore(tkey, encPubKeyX);
      }
      this._cleanUpCurrentRequest();
      return receivedShare;
    }
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
