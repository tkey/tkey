import { DeviceShareDescription, IModule, ITKeyApi, ShareStore, StringifiedType } from "@tkey/common-types";

import KeyStore from "./KeyStore";
import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";

export const REACT_NATIVE_STORAGE_MODULE_NAME = "reactNativeStorage";

export default class ReactNativeStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  private keyStore: KeyStore;

  constructor(storage: SecureStore | EncryptedStorage) {
    this.moduleName = REACT_NATIVE_STORAGE_MODULE_NAME;
    this.keyStore = new KeyStore(storage);
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK._setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async storeDeviceShare(deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType): Promise<void> {
    await this.storeShareOnReactNativeStorage(deviceShareStore);
    const shareDescription: DeviceShareDescription = {
      module: this.moduleName,
      userAgent: window.navigator.userAgent,
      dateAdded: Date.now(),
    };
    if (customDeviceInfo) {
      shareDescription.customDeviceInfo = JSON.stringify(customDeviceInfo);
    }
    await this.tbSDK.addShareDescription(deviceShareStore.share.shareIndex.toString("hex"), JSON.stringify(shareDescription), true);
  }

  async storeShareOnReactNativeStorage(share: ShareStore): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString("hex"); // tbkey public
    return this.keyStore.set(key, JSON.stringify(share));
  }

  async getStoreFromReactNativeStorage(): Promise<ShareStore> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString("hex"); // tbkey public
    const result = await this.keyStore.get(key);
    const verifierIdObj: ShareStore = JSON.parse(result);
    await this.tbSDK.inputShareStoreSafe(verifierIdObj);
    return verifierIdObj;
  }

  async inputShareFromReactNativeStorage(): Promise<void> {
    const castedShareStore = await this.getStoreFromReactNativeStorage();
    const latestShareDetails = await this.tbSDK.catchupToLatestShare({ shareStore: castedShareStore, includeLocalMetadataTransitions: true });
    this.tbSDK.inputShareStore(latestShareDetails.latestShare);
  }
}
