import { KeyType } from "@tkey/common-types";
import ServiceProviderTorus from "@tkey/service-provider-torus";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const PRIVATE_KEY = generatePrivate().toString("hex");
const torusSp = new ServiceProviderTorus({
  postboxKey: PRIVATE_KEY,
  customAuthArgs: {
    baseUrl: "http://localhost:3000",
    web3AuthClientId: "test",
    network: "mainnet",
  },
});
const metadataURL = getMetadataUrl();

const torusSL = initStorageLayer({ hostUrl: metadataURL });

const testVariables = [
  {
    keyType: KeyType.secp256k1,
    MANUAL_SYNC: true,
  },
  {
    keyType: KeyType.ed25519,
    MANUAL_SYNC: true,
  },
];

testVariables.forEach((testVariable) => {
  const { keyType, MANUAL_SYNC } = testVariable;
  describe(`TorusServiceProvider with manualSync: ${MANUAL_SYNC}, keyType ${keyType}`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    sharedTestCases(MANUAL_SYNC, torusSp, torusSL, keyType);
  });
});
