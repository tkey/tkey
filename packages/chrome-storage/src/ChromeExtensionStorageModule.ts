import { IModule, ITKeyApi, ShareStore } from "@tkey/common-types";

export const CHROME_EXTENSION_STORAGE_MODULE_NAME = "chromeExtensionStorage";

export default class ChromeExtensionStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = CHROME_EXTENSION_STORAGE_MODULE_NAME;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK.setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async storeDeviceShare(deviceShareStore: ShareStore): Promise<void> {
    await this.storeShareOnChromeExtensionStorage(deviceShareStore);
    await this.tbSDK.addShareDescription(
      deviceShareStore.share.shareIndex.toString("hex"),
      JSON.stringify({ module: this.moduleName, userAgent: window.navigator.userAgent, dateAdded: Date.now() }),
      true
    );
  }

  async storeShareOnChromeExtensionStorage(share: ShareStore): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString("hex"); // tbkey public
    return new Promise((resolve, reject) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else chrome.storage.sync.set({ [key]: JSON.stringify(share) }, resolve);
    });
  }

  async getStoreFromChromeExtensionStorage(): Promise<ShareStore> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString("hex"); // tbkey public
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get([key], async (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else {
          try {
            const verifierIdObj: ShareStore = JSON.parse(result[key]);
            this.tbSDK.inputShare(verifierIdObj);
            resolve(verifierIdObj);
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  }

  async inputShareFromChromeExtensionStorage(): Promise<void> {
    const castedShareStore = await this.getStoreFromChromeExtensionStorage();
    const latestShareDetails = await this.tbSDK.catchupToLatestShare(castedShareStore);
    this.tbSDK.inputShare(latestShareDetails.latestShare);
  }
}
