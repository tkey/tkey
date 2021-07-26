import ServiceProviderBase from "@tkey/service-provider-base";
import { generatePrivate } from "@toruslabs/eccrypto";

import { initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const MANUAL_SYNC = false;
const metadataURL = process.env.METADATA || "http://localhost:5051";

const PRIVATE_KEY = generatePrivate().toString("hex");
const defaultSP = new ServiceProviderBase({ postboxKey: PRIVATE_KEY });
const defaultSL = initStorageLayer({ serviceProvider: defaultSP, hostUrl: metadataURL });

describe(`Manual sync: ${MANUAL_SYNC}`, function () {
  sharedTestCases(MANUAL_SYNC, defaultSP, defaultSL);
});
