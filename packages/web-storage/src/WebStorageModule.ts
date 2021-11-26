import { BNString, DeviceShareDescription, IModule, ITKeyApi, prettyPrintError, ShareStore, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";

import WebStorageError from "./errors";
import { canAccessFileStorage, getShareFromFileStorage, storeShareOnFileStorage } from "./FileStorageHelpers";
import { getShareFromLocalStorage, storeShareOnLocalStorage } from "./LocalStorageHelpers";

export const WEB_STORAGE_MODULE_NAME = "webStorage";

class WebStorageModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  canUseFileStorage: boolean;

  constructor(canUseFileStorage = true) {
    this.moduleName = WEB_STORAGE_MODULE_NAME;
    this.canUseFileStorage = canUseFileStorage;
    this.setFileStorageAccess();
  }

  async setFileStorageAccess(): Promise<void> {
    try {
      const result = await canAccessFileStorage();
      if (result.state === "denied") {
        this.canUseFileStorage = false;
      } else if (result.state === "granted") {
        this.canUseFileStorage = true;
      }
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      result.onchange = function permissionChange() {
        if (this.state === "denied") {
          self.canUseFileStorage = false;
        } else if (this.state === "granted") {
          self.canUseFileStorage = true;
        }
      };
    } catch (error) {}
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK._setDeviceStorage(this.storeDeviceShare.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async storeDeviceShare(deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const tkeypubx = metadata.pubKey.x.toString("hex");
    await storeShareOnLocalStorage(deviceShareStore, tkeypubx);
    const shareDescription: DeviceShareDescription = {
      module: this.moduleName,
      userAgent: navigator.userAgent,
      dateAdded: Date.now(),
    };
    if (customDeviceInfo) {
      shareDescription.customDeviceInfo = JSON.stringify(customDeviceInfo);
    }
    await this.tbSDK.addShareDescription(deviceShareStore.share.shareIndex.toString("hex"), JSON.stringify(shareDescription), true);
  }

  async storeDeviceShareOnFileStorage(shareIndex: BNString): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const tkeypubx = metadata.pubKey.x.toString("hex");
    const shareStore = this.tbSDK.outputShareStore(new BN(shareIndex));
    return storeShareOnFileStorage(shareStore, tkeypubx);
  }

  async getDeviceShare(): Promise<ShareStore> {
    const metadata = this.tbSDK.getMetadata();
    const tkeypubx = metadata.pubKey.x.toString("hex");
    let shareStore: ShareStore;
    try {
      shareStore = await getShareFromLocalStorage(tkeypubx);
    } catch (localErr) {
      if (this.canUseFileStorage) {
        try {
          shareStore = await getShareFromFileStorage(tkeypubx);
        } catch (fileErr) {
          if (fileErr?.message?.includes("storage quota")) {
            // User has denied access to storage. stop asking for every share
            this.canUseFileStorage = false;
          }
          throw WebStorageError.unableToReadFromStorage(
            `Error inputShareFromWebStorage: ${prettyPrintError(localErr)} and ${prettyPrintError(fileErr)}`
          );
        }
      }
      throw WebStorageError.unableToReadFromStorage(`Error inputShareFromWebStorage: ${prettyPrintError(localErr)}`);
    }
    return shareStore;
  }

  async inputShareFromWebStorage(): Promise<void> {
    const shareStore = await this.getDeviceShare();
    let latestShareStore = shareStore;
    const metadata = this.tbSDK.getMetadata();
    if (metadata.getLatestPublicPolynomial().getPolynomialID() !== shareStore.polynomialID) {
      latestShareStore = (await this.tbSDK.catchupToLatestShare({ shareStore, includeLocalMetadataTransitions: true })).latestShare;
      const tkeypubx = metadata.pubKey.x.toString("hex");
      await storeShareOnLocalStorage(latestShareStore, tkeypubx);
    }
    this.tbSDK.inputShareStore(latestShareStore);
  }
}

export default WebStorageModule;
