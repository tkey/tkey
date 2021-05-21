import { IModule, ITKeyApi, ShareStore } from "@tkey/common-types";
import { browser } from "webextension-polyfill-ts";

export const CHROME_EXTENSION_STORAGE_MODULE_NAME = "chromeExtensionStorage";

export default class ChromeExtensionStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = CHROME_EXTENSION_STORAGE_MODULE_NAME;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK._setDeviceStorage(this.storeDeviceShare.bind(this));
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
    return browser.storage.sync.set({ [key]: JSON.stringify(share) });
  }

  async getStoreFromChromeExtensionStorage(): Promise<ShareStore> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString("hex"); // tbkey public
    const result = await browser.storage.sync.get(key);
    const verifierIdObj: ShareStore = JSON.parse(result[key]);
    await this.tbSDK.inputShareStoreSafe(verifierIdObj);
    return verifierIdObj;
  }

  async inputShareFromChromeExtensionStorage(): Promise<void> {
    const castedShareStore = await this.getStoreFromChromeExtensionStorage();
    const latestShareDetails = await this.tbSDK.catchupToLatestShare({ shareStore: castedShareStore, includeLocalMetadataTransitions: true });
    this.tbSDK.inputShareStore(latestShareDetails.latestShare);
  }
}
