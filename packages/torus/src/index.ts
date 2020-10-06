import TKey from "@tkey/core";
import TorusServiceProvider from "@tkey/service-provider-torus";
import ShareTransferModule, { SHARE_TRANSFER_MODULE_NAME } from "@tkey/share-transfer";
import TorusStorageLayer from "@tkey/storage-layer-torus";
import { TKeyArgs } from "@tkey/types";

class ThresholdKey extends TKey {
  constructor(args?: TKeyArgs) {
    const { modules = {}, serviceProvider, storageLayer, directParams } = args;
    const defaultModules = {
      [SHARE_TRANSFER_MODULE_NAME]: new ShareTransferModule(),
    };
    super({ ...args, modules: { ...defaultModules, ...modules } });
    if (!serviceProvider) {
      this.serviceProvider = new TorusServiceProvider({ directParams });
    } else {
      this.serviceProvider = serviceProvider;
    }
    if (!storageLayer) {
      this.storageLayer = new TorusStorageLayer({ serviceProvider: this.serviceProvider });
    } else {
      this.storageLayer = storageLayer;
    }
  }
}

export default ThresholdKey;
