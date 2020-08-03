// import Bowser from "bowser"; // ES6 (and TypeScript with --esModuleInterop enabled)

import { IModule, IThresholdBak } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";

export default class ChromeExtensionStorageModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  constructor() {
    this.moduleName = "chromeExtensionStorage";
  }

  async initialize(tbSDK: IThresholdBak): Promise<void> {
    this.tbSDK = tbSDK;
    // this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
    // this.tbSDK.setDeviceStorage(this.storeDeviceShare.bind(this));
    // this.tbSDK.chromeDeviceStrage = this.storeShareOnChromeExtensionStorage.bind(this)
  }

  async storeDeviceShare(chrome: any, verifierId: string, deviceShareStore: ShareStore): Promise<void> {
    await this.storeShareOnChromeExtensionStorage(chrome, verifierId, deviceShareStore);
    await this.tbSDK.addShareDescription(
      deviceShareStore.share.shareIndex.toString("hex"),
      JSON.stringify({ module: this.moduleName, userAgent: window.navigator.userAgent }),
      true
    );
  }

  async storeShareOnChromeExtensionStorage(chrome: any, verifierId: string, share: ShareStore): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [verifierId]: JSON.stringify(share) }, function () {
        resolve();
      });
    });
  }

  async getStoreFromChromeExtensionStorage(chrome: any, verifierId: string): Promise<ShareStore> {
    return new Promise((resolve) => {
      chrome.storage.sync.get([verifierId], async (result) => {
        const verifierIdObj = JSON.parse(result[verifierId]);
        this.tbSDK.inputShare(verifierIdObj as ShareStore);
        resolve(verifierIdObj as ShareStore);
      });
    });
  }

  async inputShareFromChromeExtensionStorage(chrome: any, verifierId: string): Promise<void> {
    try {
      const castedShareStore = await this.getStoreFromChromeExtensionStorage(chrome, verifierId);
      const latestShareDetails = await this.tbSDK.catchupToLatestShare(castedShareStore);
      // if (castedShareStore.polynomialID !== latestShareDetails.latestShare.polynomialID) this.storeDeviceShare(latestShareDetails.latestShare);
      this.tbSDK.inputShare(latestShareDetails.latestShare);
    } catch (err) {
      console.log(err);
    }
  }
}
