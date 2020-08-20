// import Bowser from "bowser"; // ES6 (and TypeScript with --esModuleInterop enabled)

import { ShareStore } from "../base";
import { IModule, ITKeyApi } from "../baseTypes/aggregateTypes";

export default class ChromeExtensionStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = "chromeExtensionStorage";
  }

  async initialize(tbSDK: ITKeyApi): Promise<void> {
    this.tbSDK = tbSDK;
    this.tbSDK.setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  async storeDeviceShare(deviceShareStore: ShareStore): Promise<void> {
    await this.storeShareOnChromeExtensionStorage(deviceShareStore);
    await this.tbSDK.addShareDescription(
      deviceShareStore.share.shareIndex.toString("hex"),
      JSON.stringify({ module: this.moduleName, userAgent: window.navigator.userAgent, dateAdded: Date.now() }),
      true
    );
  }

  async storeShareOnChromeExtensionStorage(share: ShareStore): Promise<void> {
    const key = this.tbSDK.metadata.pubKey.x.toString("hex"); // tbkey public
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: JSON.stringify(share) }, function () {
        resolve();
      });
    });
  }

  async getStoreFromChromeExtensionStorage(): Promise<ShareStore> {
    const key = this.tbSDK.metadata.pubKey.x.toString("hex"); // tbkey public
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], async (result) => {
        try {
          const verifierIdObj = JSON.parse(result[key]);
          this.tbSDK.inputShare(verifierIdObj as ShareStore);
          resolve(verifierIdObj as ShareStore);
        } catch (err) {
          reject();
        }
      });
    });
  }

  async inputShareFromChromeExtensionStorage(): Promise<void> {
    const castedShareStore = await this.getStoreFromChromeExtensionStorage();
    const latestShareDetails = await this.tbSDK.catchupToLatestShare(castedShareStore);
    // if (castedShareStore.polynomialID !== latestShareDetails.latestShare.polynomialID) this.storeDeviceShare(latestShareDetails.latestShare);
    this.tbSDK.inputShare(latestShareDetails.latestShare);
  }
}
