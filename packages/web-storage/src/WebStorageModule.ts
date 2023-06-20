import { BNString, DeviceShareDescription, ITKeyApi, prettyPrintError, ShareStore, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";

import WebStorageError from "./errors";
import { canAccessFileStorage, getShareFromFileStorage, storeShareOnFileStorage } from "./FileStorageHelpers";
import { getShareFromLocalStorage, storeShareOnLocalStorage } from "./LocalStorageHelpers";

export const WEB_STORAGE_MODULE_NAME = "webStorage";

class WebStorageModule {
  moduleName: string;

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

  async storeDeviceShare(tkey: ITKeyApi, deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType): Promise<void> {
    const metadata = tkey.getMetadata();
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
    await tkey.addShareDescription(deviceShareStore.share.shareIndex.toString("hex"), JSON.stringify(shareDescription), true);
  }

  async storeDeviceShareOnFileStorage(tkey: ITKeyApi, shareIndex: BNString): Promise<void> {
    const metadata = tkey.getMetadata();
    const tkeypubx = metadata.pubKey.x.toString("hex");
    const shareStore = tkey.outputShareStore(new BN(shareIndex));
    return storeShareOnFileStorage(shareStore, tkeypubx);
  }

  async getDeviceShare(tkey: ITKeyApi): Promise<ShareStore> {
    const metadata = tkey.getMetadata();
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

  async inputShareFromWebStorage(tkey: ITKeyApi): Promise<void> {
    const shareStore = await this.getDeviceShare(tkey);
    let latestShareStore = shareStore;
    const metadata = tkey.getMetadata();
    if (metadata.getLatestPublicPolynomial().getPolynomialID() !== shareStore.polynomialID) {
      latestShareStore = (await tkey.catchupToLatestShare({ shareStore, includeLocalMetadataTransitions: true })).latestShare;
      const tkeypubx = metadata.pubKey.x.toString("hex");
      await storeShareOnLocalStorage(latestShareStore, tkeypubx);
    }
    tkey.inputShareStore(latestShareStore);
  }
}

export default WebStorageModule;
