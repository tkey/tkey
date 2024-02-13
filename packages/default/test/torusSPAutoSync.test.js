import { KeyType, generatePrivate } from "@tkey/common-types";
import ServiceProviderTorus from "@tkey/service-provider-torus";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const metadataURL = getMetadataUrl();

const torusSL = initStorageLayer({ hostUrl: metadataURL });

const testVariables = [
  {
    keyType: KeyType.secp256k1,
    MANUAL_SYNC: false,
  },
  {
    keyType: KeyType.ed25519,
    MANUAL_SYNC: false,
  },
];

testVariables.forEach((testVariable) => {
  const { keyType, MANUAL_SYNC } = testVariable;

  describe(`TorusServiceProvider with manualSync: ${MANUAL_SYNC}, keyType ${keyType}`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    const PRIVATE_KEY = generatePrivate(keyType).toString("hex");
    const torusSP = new ServiceProviderTorus({
      postboxKey: PRIVATE_KEY,
      customAuthArgs: {
        // this url has no effect as postbox key is passed
        // passing it just to satisfy direct auth checks.
        baseUrl: "http://localhost:3000",
        web3AuthClientId: "test",
        network: "mainnet",
      },
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    sharedTestCases(MANUAL_SYNC, torusSP, torusSL, keyType);
  });
});
