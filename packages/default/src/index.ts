import { IServiceProvider, IStorageLayer, StringifiedType, TKeyArgs } from "@tkey/common-types";
import TKey from "@tkey/core";
import ServiceProviderBase from "@tkey/service-provider-base";
import TorusServiceProvider from "@tkey/service-provider-torus";
import { SHARE_SERIALIZATION_MODULE_NAME, ShareSerializationModule } from "@tkey/share-serialization";
import ShareTransferModule, { SHARE_TRANSFER_MODULE_NAME } from "@tkey/share-transfer";
import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";

class ThresholdKey extends TKey {
  constructor(args?: TKeyArgs) {
    const { modules = {}, serviceProvider, storageLayer, directParams } = args || {};
    const defaultModules = {
      [SHARE_TRANSFER_MODULE_NAME]: new ShareTransferModule(),
      [SHARE_SERIALIZATION_MODULE_NAME]: new ShareSerializationModule(),
    };
    let finalServiceProvider: IServiceProvider;
    let finalStorageLayer: IStorageLayer;
    if (!serviceProvider) {
      finalServiceProvider = new TorusServiceProvider({ directParams });
    } else {
      finalServiceProvider = serviceProvider;
    }
    if (!storageLayer) {
      finalStorageLayer = new TorusStorageLayer({ serviceProvider: finalServiceProvider, hostUrl: "https://metadata.tor.us" });
    } else {
      finalStorageLayer = storageLayer;
    }
    super({ ...(args || {}), modules: { ...defaultModules, ...modules }, serviceProvider: finalServiceProvider, storageLayer: finalStorageLayer });
  }

  static async fromJSON(value: StringifiedType, args?: TKeyArgs): Promise<ThresholdKey> {
    const { storageLayer: tempOldStorageLayer, serviceProvider: tempOldServiceProvider } = value;
    const { storageLayer, serviceProvider, modules = {}, directParams } = args || {};
    const defaultModules = {
      [SHARE_TRANSFER_MODULE_NAME]: new ShareTransferModule(),
      [SHARE_SERIALIZATION_MODULE_NAME]: new ShareSerializationModule(),
    };

    const finalServiceProvider: IServiceProvider =
      serviceProvider ||
      TorusServiceProvider.fromJSON(tempOldServiceProvider) ||
      ServiceProviderBase.fromJSON(tempOldServiceProvider) ||
      new TorusServiceProvider({ directParams });

    const finalStorageLayer: IStorageLayer =
      storageLayer ||
      TorusStorageLayer.fromJSON(tempOldStorageLayer) ||
      MockStorageLayer.fromJSON(tempOldStorageLayer) ||
      new TorusStorageLayer({ serviceProvider: finalServiceProvider, hostUrl: "https://metadata.tor.us" });

    return super.fromJSON(value, {
      ...(args || {}),
      modules: { ...defaultModules, ...modules },
      serviceProvider: finalServiceProvider,
      storageLayer: finalStorageLayer,
    });
  }
}

export default ThresholdKey;
