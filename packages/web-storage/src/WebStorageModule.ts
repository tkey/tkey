import { BNString, IModule, ITKeyApi, prettyPrintError, ShareStore } from "@tkey/types";
import BN from "bn.js";

import { getShareFromFileStorage, storeShareOnFileStorage } from "./FileStorageHelpers";
import { getShareFromLocalStorage, storeShareOnLocalStorage } from "./LocalStorageHelpers";

class WebStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  canUseFileStorage: boolean;

  constructor(canUseFileStorage = true) {
    this.moduleName = "webStorage";
    this.canUseFileStorage = canUseFileStorage;
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

  async storeDeviceShareOnFileStorage(shareIndex: BNString): Promise<void> {
    const shareStore = this.tbSDK.outputShare(new BN(shareIndex));
    return storeShareOnFileStorage(shareStore);
  }

  async getDeviceShare(): Promise<ShareStore> {
    const metadata = this.tbSDK.getMetadata();
    const polyID = metadata.getLatestPublicPolynomial().getPolynomialID();
    let shareStore: ShareStore;
    try {
      shareStore = await getShareFromLocalStorage(polyID);
    } catch (localErr) {
      if (this.canUseFileStorage) {
        try {
          shareStore = await getShareFromFileStorage(polyID);
        } catch (FileErr) {
          if (FileErr?.message?.includes("storage quota")) {
            // User has denied access to storage. stop asking for every share
            this.canUseFileStorage = false;
          }
          throw new Error(`Error inputShareFromWebStorage: ${prettyPrintError(localErr)} and ${prettyPrintError(FileErr)}`);
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
