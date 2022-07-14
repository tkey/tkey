import ServiceProviderTorus from "@tkey/service-provider-torus";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const metadataURL = getMetadataUrl();

const PRIVATE_KEY = generatePrivate().toString("hex");
const torusSP = new ServiceProviderTorus({
  postboxKey: PRIVATE_KEY,
  customAuthArgs: {
    // this url has no effect as postbox key is passed
    // passing it just to satisfy direct auth checks.
    baseUrl: "http://localhost:3000",
  },
});

const torusSL = initStorageLayer({ hostUrl: metadataURL });

const MANUAL_SYNC = false;
describe(`TorusServiceProvider with manualSync: ${MANUAL_SYNC}`, function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  sharedTestCases(MANUAL_SYNC, torusSP, torusSL);
});
