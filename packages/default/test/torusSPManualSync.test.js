import ServiceProviderTorus from "@tkey/service-provider-torus";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const PRIVATE_KEY = generatePrivate().toString("hex");
const torusSp = new ServiceProviderTorus({
  postboxKey: PRIVATE_KEY,
  customAuthArgs: {
    baseUrl: "http://localhost:3000",
  },
});
const metadataURL = getMetadataUrl();

const torusSL = initStorageLayer({ hostUrl: metadataURL });

const MANUAL_SYNC = true;
describe(`TorusServiceProvider with manualSync: ${MANUAL_SYNC}`, function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  sharedTestCases(MANUAL_SYNC, torusSp, torusSL);
});
