import BN from "bn.js";

import { ShareStore } from "../base";
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
import { getShareFromChromeFileStorage, storeShareOnFileStorage } from "./ChromeStorageHelpers";
import { getShareFromLocalStorage, storeShareOnLocalStorage } from "./LocalStorageHelpers";

class WebStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  canUseChromeStorage: boolean;

  constructor(canUseChromeStorage = true) {
    this.moduleName = "webStorage";
    this.canUseChromeStorage = canUseChromeStorage;
  }

  async initialize(tbSDK: ITKeyApi): Promise<void> {
    this.tbSDK = tbSDK;
    // this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
    this.tbSDK.setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  async storeDeviceShare(deviceShareStore: ShareStore): Promise<void> {
    await storeShareOnLocalStorage(deviceShareStore);
    await this.tbSDK.addShareDescription(
      deviceShareStore.share.shareIndex.toString("hex"),
      JSON.stringify({ module: this.moduleName, userAgent: window.navigator.userAgent, dateAdded: Date.now() }),
      true
    );
  }

  async storeDeviceShareOnFileStorage(): Promise<void> {
    const shareStore = this.tbSDK.outputShare(new BN(2));
    return storeShareOnFileStorage(shareStore);
  }

  async getDeviceShare(): Promise<ShareStore> {
    const polyID = this.tbSDK.metadata.getLatestPublicPolynomial().getPolynomialID();
    let shareStore: ShareStore;
    try {
      shareStore = await getShareFromLocalStorage(polyID);
    } catch (localErr) {
      if (this.canUseChromeStorage) {
        try {
          shareStore = await getShareFromChromeFileStorage(polyID);
        } catch (chromeErr) {
          if (chromeErr?.message?.includes("storage quota")) {
            // User has denied access to storage. stop asking for every share
            this.canUseChromeStorage = false;
          }
          throw new Error(`Error inputShareFromWebStorage: ${localErr} and ${chromeErr}`);
        }
      }
      throw new Error(`Error inputShareFromWebStorage: ${localErr}`);
    }
    return shareStore;
  }

  async inputShareFromWebStorage(): Promise<void> {
    const shareStore = await this.getDeviceShare();
    const latestShareDetails = await this.tbSDK.catchupToLatestShare(shareStore);
    if (shareStore.polynomialID !== latestShareDetails.latestShare.polynomialID) this.storeDeviceShare(latestShareDetails.latestShare);
    this.tbSDK.inputShare(latestShareDetails.latestShare);
  }
}

export default WebStorageModule;
