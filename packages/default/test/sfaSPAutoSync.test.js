import { SfaServiceProvider } from "@tkey/service-provider-sfa";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { sharedTestCases } from "./shared";

const MANUAL_SYNC = false;
const metadataURL = getMetadataUrl();
const PRIVATE_KEY = generatePrivate().toString("hex");
const sfaSP = new SfaServiceProvider({
    postboxKey: PRIVATE_KEY,
    web3AuthOptions: {
      clientId: "YOUR_CLIENT_ID",
    },
  });
  
const sfaSL = initStorageLayer({ hostUrl: metadataURL });

describe(`SfaServiceProvider with manualSync: ${MANUAL_SYNC}`, function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  sharedTestCases(MANUAL_SYNC, sfaSP, sfaSL);
});
