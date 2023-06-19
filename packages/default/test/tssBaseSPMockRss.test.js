// import ServiceProviderBase from "@tkey/service-provider-base";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import { generatePrivate } from "@toruslabs/eccrypto";

import { getMetadataUrl, initStorageLayer } from "./helpers";
import { tssSharedTests } from "./tssShared";

const PRIVATE_KEY = generatePrivate().toString("hex");

const torusSp = new ServiceProviderBase({
  postboxKey: PRIVATE_KEY,
  tssVerifier: "test-tss-verifier",
  useTSS: true,
  // tssPubKey: {
  //   // test key: bc0def03430ddb9d57a5fa2cb18786ee21c55255016c7b5db9616d0463b4b7ed
  //   x: new BN("9c381cea525bcc72b05272afe8ea75b1c3029966caa5953aa64b5d84d7a97773", "hex"),
  //   y: new BN("4f3909bf64be23a32887086fccd449e0e57042622a1364e0d670f6eb798238d7", "hex"),
  // },
  customAuthArgs: {
    network: "sapphire_mainnet",
    web3AuthClientId: "YOUR_CLIENT_ID",
    baseUrl: "http://localhost:3000",
  },
});

// const torusSp = new ServiceProviderBase({
//   postboxKey: PRIVATE_KEY,
//   useTSS: true,
// });
const metadataURL = getMetadataUrl();
const torusSL = initStorageLayer({ hostUrl: metadataURL });

describe(`TSS Test with BaseServiceProvider Mock RSS`, function () {
  const MOCK_RSS = true;
  describe(`TSS BaseServiceProvider Mock RSS with manualSync: ${true}`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    tssSharedTests(true, torusSp, torusSL, MOCK_RSS);
  });

  describe(`TSS BaseServiceProvider Mock RSS with manualSync: ${false}`, function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    tssSharedTests(false, torusSp, torusSL, MOCK_RSS);
  });
});
