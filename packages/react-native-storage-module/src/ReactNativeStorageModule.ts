import {
  DeviceShareDescription,
  IModule,
  ITKeyApi,
  ShareStore,
  StringifiedType,
} from '@thresholdkey/common-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserAgent } from 'react-native-device-info';

export const REACT_NATIVE_STORAGE_MODULE_NAME = 'reactNativeStorage';

export default class ReactNativeStorageModule implements IModule {
  moduleName: string;
  // @ts-ignore
  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = REACT_NATIVE_STORAGE_MODULE_NAME;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK._setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  async initialize(): Promise<void> {}

  async storeDeviceShare(
    deviceShareStore: ShareStore,
    customDeviceInfo?: StringifiedType
  ): Promise<void> {
    await this.storeShareOnReactNativeStorage(deviceShareStore);
    const userAgent = await getUserAgent();
    const shareDescription: DeviceShareDescription = {
      module: this.moduleName,
      userAgent,
      dateAdded: Date.now(),
    };
    if (customDeviceInfo) {
      shareDescription.customDeviceInfo = JSON.stringify(customDeviceInfo);
    }
    await this.tbSDK.addShareDescription(
      deviceShareStore.share.shareIndex.toString('hex'),
      JSON.stringify(shareDescription),
      true
    );
  }

  async storeShareOnReactNativeStorage(share: ShareStore): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString('hex'); // tbkey public
    return AsyncStorage.setItem(key, JSON.stringify(share));
  }

  async getStoreFromReactNativeStorage(): Promise<ShareStore> {
    const metadata = this.tbSDK.getMetadata();
    const key = metadata.pubKey.x.toString('hex'); // tbkey public
    const result = await AsyncStorage.getItem(key);
    if (!result) throw new Error('Not found');
    const verifierIdObj: ShareStore = JSON.parse(result);
    await this.tbSDK.inputShareStoreSafe(verifierIdObj);
    return verifierIdObj;
  }

  async inputShareFromReactNativeStorage(): Promise<void> {
    const castedShareStore = await this.getStoreFromReactNativeStorage();
    const latestShareDetails = await this.tbSDK.catchupToLatestShare({
      shareStore: castedShareStore,
      includeLocalMetadataTransitions: true,
    });
    this.tbSDK.inputShareStore(latestShareDetails.latestShare);
  }
}
