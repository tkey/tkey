import { getPubKeyPoint } from "@tkey/common-types";
import ServiceProviderBase from "@tkey/service-provider-base";
import ServiceProviderTorus from "@tkey/service-provider-torus";
import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";
import { fail } from "assert";
import { BN } from "bn.js";

import ThresholdKey from "../src";

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
  let metadataURL = process.env.METADATA || "http://localhost:5051";
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

export function getTempKey() {
  return generatePrivate().toString("hex");
}

// export async function createBasicTSSSetup() {
//   const sp = customSP;
//   const testId = "test@test.com\u001cgoogle";
//   if (!sp.tssVerifier) return;

//   // initialization with SP
//   const tss1 = new BN(generatePrivate());
//   sp.setTSSPubKey(getPubKeyPoint(tss1));
//   sp.postboxKey = new BN(getTempKey(), "hex");
//   const storageLayer = initStorageLayer({ hostUrl: metadataURL });
//   const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

//   // factor key needs to passed from outside of tKey
//   const factorKey = new BN(generatePrivate());
//   const factorPub = getPubKeyPoint(factorKey);

//   // tss and factor key are passed externally
//   await tb1.initialize({ useTSS: true, factorPub, _tss2: new BN(generatePrivate()) });
//   // const newShare = await tb1.generateNewShare(); // 2/3 tkey generation
//   const reconstructedKey = await tb1.reconstructKey();
//   await tb1.syncLocalMetadataTransitions();
//   if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
//     fail("key should be able to be reconstructed");
//   }
// }
