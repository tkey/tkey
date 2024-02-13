import { KeyType } from "@tkey/common-types";
import ServiceProviderBase from "@tkey/service-provider-base";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

// const MANUAL_SYNC = true;
const metadataURL = getMetadataUrl();

const defaultSL = initStorageLayer({ hostUrl: metadataURL });

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
  describe(`BaseServiceProvider with manualSync: ${MANUAL_SYNC}, keyType: ${keyType} `, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    const PRIVATE_KEY = generatePrivate(keyType).toString("hex");
    const defaultSP = new ServiceProviderBase({ postboxKey: PRIVATE_KEY, keyType });
    // eslint-disable-next-line mocha/no-setup-in-describe
    sharedTestCases(MANUAL_SYNC, defaultSP, defaultSL, keyType);
  });
});
