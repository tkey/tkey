import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";

const mocked = process.env.MOCKED || "false";

export function initStorageLayer(extraParams) {
  return mocked === "true" ? new MockStorageLayer({ serviceProvider: extraParams.serviceProvider }) : new TorusStorageLayer(extraParams);
}
