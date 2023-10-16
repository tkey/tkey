import ServiceProviderBase from "@oraichain/service-provider-base";
import ServiceProviderTorus from "@oraichain/service-provider-torus";
import TorusStorageLayer, { MockStorageLayer } from "@oraichain/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";

let mocked;
const isNode = process.release;
if (!isNode) {
  // eslint-disable-next-line no-undef
  [mocked] = __karma__.config.args;
} else {
  mocked = process.env.MOCKED || "false";
}

export const isMocked = mocked === "true";

export function getMetadataUrl() {
  let metadataURL = process.env.METADATA || "https://metadata.social-login.orai.io";
  if (!isNode) {
    // eslint-disable-next-line no-undef
    [, metadataURL] = __karma__.config.args;
  }
  return metadataURL;
}

export function initStorageLayer(extraParams) {
  return mocked === "true" ? new MockStorageLayer() : new TorusStorageLayer(extraParams);
}

export function getServiceProvider(params) {
  const { type, privKeyBN, isEmptyProvider } = params;
  const PRIVATE_KEY = privKeyBN ? privKeyBN.toString("hex") : generatePrivate().toString("hex");
  if (type === "TorusServiceProvider") {
    return new ServiceProviderTorus({
      postboxKey: isEmptyProvider ? null : PRIVATE_KEY,
      customAuthArgs: {
        // this url has no effect as postbox key is passed
        // passing it just to satisfy direct auth checks.
        baseUrl: "http://localhost:3000",
      },
    });
  }
  return new ServiceProviderBase({ postboxKey: isEmptyProvider ? null : PRIVATE_KEY });
}
