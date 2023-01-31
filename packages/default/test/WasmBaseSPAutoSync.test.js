import "./migration_tests/function";

import ServiceProviderTorus from "@tkey/service-provider-torus";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./migration_tests/shared";


js_post("https://api.tor.us/v1/torus/verify", "")
  .then((res) => {
    console.log(res);
    return res;
  })
  .catch((err) => {
    console.log(err);
  });
const metadataURL = getMetadataUrl();
// eslint-disable-next-line no-console
console.log(metadataURL);
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

// eslint-disable-next-line no-console
console.log(torusSL.toJSON());
const MANUAL_SYNC = false;
describe.only(`TorusServiceProvider Wasm with manualSync: false`, function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  sharedTestCases(MANUAL_SYNC, torusSP, true);
});
