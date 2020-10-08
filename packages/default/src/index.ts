import { IServiceProvider, IStorageLayer, TKeyArgs } from "@tkey/common-types";
import TKey from "@tkey/core";
import TorusServiceProvider from "@tkey/service-provider-torus";
import { SHARE_SERIALIZATION_MODULE, ShareSerializationModule } from "@tkey/share-serialization";
import ShareTransferModule, { SHARE_TRANSFER_MODULE_NAME } from "@tkey/share-transfer";
import TorusStorageLayer from "@tkey/storage-layer-torus";

class ThresholdKey extends TKey {
  constructor(args?: TKeyArgs) {
    const { modules = {}, serviceProvider, storageLayer, directParams } = args;
    const defaultModules = {
      [SHARE_TRANSFER_MODULE_NAME]: new ShareTransferModule(),
      [SHARE_SERIALIZATION_MODULE]: new ShareSerializationModule(),
    };
    let finalServiceProvider: IServiceProvider;
    let finalStorageLayer: IStorageLayer;
    if (!serviceProvider) {
      finalServiceProvider = new TorusServiceProvider({ directParams });
    } else {
      finalServiceProvider = serviceProvider;
    }
    if (!storageLayer) {
      finalStorageLayer = new TorusStorageLayer({ serviceProvider: finalServiceProvider });
    } else {
      finalStorageLayer = storageLayer;
    }
    super({ ...args, modules: { ...defaultModules, ...modules }, serviceProvider: finalServiceProvider, storageLayer: finalStorageLayer });
  }
}

export default ThresholdKey;
