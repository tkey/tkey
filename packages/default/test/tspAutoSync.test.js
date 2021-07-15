import ServiceProviderTorus from "@tkey/service-provider-torus";
import { generatePrivate } from "@toruslabs/eccrypto";

import { initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const PRIVATE_KEY = generatePrivate().toString("hex");
const torusSp = new ServiceProviderTorus({
  postboxKey: PRIVATE_KEY,
  directParams: {
    // this url has no effect as postbox key is passed
    // passing it just to satisfy direct auth checks.
    baseUrl: "http://localhost:3000",
  },
});
const metadataURL = process.env.METADATA || "http://localhost:5051";

const torusSL = initStorageLayer({ serviceProvider: torusSp, hostUrl: metadataURL });

const MANUAL_SYNC = false;
describe(`Torus Service provider with manual sync: ${MANUAL_SYNC}`, function () {
  sharedTestCases(MANUAL_SYNC, torusSp, torusSL);
});
