import { IServiceProvider, IStorageLayer, StringifiedType, TKeyArgs } from "@oraichain/common-types";
import TKey from "@oraichain/core";
import { ServiceProviderBase } from "@oraichain/service-provider-base";
import { TorusServiceProvider } from "@oraichain/service-provider-torus";
import { SHARE_SERIALIZATION_MODULE_NAME, ShareSerializationModule } from "@oraichain/share-serialization";
import { SHARE_TRANSFER_MODULE_NAME, ShareTransferModule } from "@oraichain/share-transfer";
import { MockStorageLayer, TorusStorageLayer } from "@oraichain/storage-layer-torus";

class ThresholdKey extends TKey {
  constructor(args?: TKeyArgs) {
    const { modules = {}, serviceProvider, storageLayer, customAuthArgs, blsDkgPackage, serverTimeOffset } = args || {};
    const defaultModules = {
      [SHARE_TRANSFER_MODULE_NAME]: new ShareTransferModule(),
      [SHARE_SERIALIZATION_MODULE_NAME]: new ShareSerializationModule(),
    };
    let finalServiceProvider: IServiceProvider;
    let finalStorageLayer: IStorageLayer;
    if (!serviceProvider) {
      finalServiceProvider = new TorusServiceProvider({ customAuthArgs, blsDkgPackage });
    } else {
      finalServiceProvider = serviceProvider;
    }
    if (!storageLayer) {
      finalStorageLayer = new TorusStorageLayer({ hostUrl: "https://metadata.social-login.orai.io", serverTimeOffset });
    } else {
      finalStorageLayer = storageLayer;
    }
    super({ ...(args || {}), modules: { ...defaultModules, ...modules }, serviceProvider: finalServiceProvider, storageLayer: finalStorageLayer });
  }

  static async fromJSON(value: StringifiedType, args?: TKeyArgs): Promise<ThresholdKey> {
    const { storageLayer: tempOldStorageLayer, serviceProvider: tempOldServiceProvider } = value;
    const { storageLayer, serviceProvider, blsDkgPackage, modules = {}, customAuthArgs, serverTimeOffset = 0 } = args || {};
    const defaultModules = {
      [SHARE_TRANSFER_MODULE_NAME]: new ShareTransferModule(),
      [SHARE_SERIALIZATION_MODULE_NAME]: new ShareSerializationModule(),
    };

    const finalServiceProvider: IServiceProvider =
      serviceProvider ||
      TorusServiceProvider.fromJSON(tempOldServiceProvider) ||
      ServiceProviderBase.fromJSON(tempOldServiceProvider) ||
      new TorusServiceProvider({ customAuthArgs, blsDkgPackage });

    tempOldStorageLayer.serviceProvider = finalServiceProvider;
    const finalStorageLayer: IStorageLayer =
      storageLayer ||
      MockStorageLayer.fromJSON(tempOldStorageLayer) ||
      TorusStorageLayer.fromJSON(tempOldStorageLayer) ||
      new TorusStorageLayer({ hostUrl: "https://metadata.social-login.orai.io", serverTimeOffset });

    return super.fromJSON(value, {
      ...(args || {}),
      modules: { ...defaultModules, ...modules },
      serviceProvider: finalServiceProvider,
      storageLayer: finalStorageLayer,
    });
  }
}

export default ThresholdKey;
