import BN from "bn.js";

import { ShareStore } from "../base";
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";
import { prettyPrintError } from "../utils";
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

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK.setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

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
    const metadata = this.tbSDK.getMetadata();
    const polyID = metadata.getLatestPublicPolynomial().getPolynomialID();
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
          throw new Error(`Error inputShareFromWebStorage: ${prettyPrintError(localErr)} and ${prettyPrintError(chromeErr)}`);
        }
      }
      throw new Error(`Error inputShareFromWebStorage: ${prettyPrintError(localErr)}`);
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
