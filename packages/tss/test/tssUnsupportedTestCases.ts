import { KeyType, Point } from "@tkey/common-types";
import { fail } from "assert";
import { ec as EC } from "elliptic";

import { TKeyTSS as ThresholdKey, TSSTorusServiceProvider } from "../src";
import { factorKeyCurve } from "../src/tss";
import { fetchPostboxKeyAndSigs, initStorageLayer } from "./helpers";

// fail case - sp ed25519 us not supported for new format
// legacy flag is false, key type is ed25519, service provider is ed25519
// legacy flag is false, key type is secp256k1, service provider is ed25519
// legacy flag is true, key type mismatched with service provider

const failTestCases = (params: { TSS_KEY_TYPE: KeyType }) => {
  const { TSS_KEY_TYPE } = params;
  const ecFactor = factorKeyCurve;
  const ecTSS = new EC(TSS_KEY_TYPE);

  const torusSPSecp256k1 = new TSSTorusServiceProvider({
    customAuthArgs: {
      network: "sapphire_devnet",
      web3AuthClientId: "YOUR_CLIENT_ID",
      baseUrl: "http://localhost:3000",
      // keyType: TSS_KEY_TYPE,
      keyType: KeyType.secp256k1,
    },
  });

  const torusSPEd25519 = new TSSTorusServiceProvider({
    customAuthArgs: {
      network: "sapphire_devnet",
      web3AuthClientId: "YOUR_CLIENT_ID",
      baseUrl: "http://localhost:3000",
      keyType: TSS_KEY_TYPE,
    },
  });

  const manualSync = true;

  describe(`TSS Unsupported tests, unsupported tests cases, keyType = ${TSS_KEY_TYPE}`, function () {
    it("#should not able to instantiate new instance when legacyFlag=false with ed25519 service provider", async function () {
      const sp = torusSPEd25519;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "testTss@example.com";
      const { postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;

      const storageLayer2 = initStorageLayer();

      try {
        new ThresholdKey({
          serviceProvider: sp,
          storageLayer: storageLayer2,
          manualSync,
          legacyMetadataFlag: false,
        });
        fail("should not be able to instantiate new instance with ed25519 service provider when legacyFlag=false");
      } catch (e) {}
    });

    it("#should not able to initialize on mismatch service provider key type when legacy flag is true", async function () {
      const sp = TSS_KEY_TYPE === KeyType.secp256k1 ? torusSPEd25519 : torusSPSecp256k1;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "testTss@example.com";
      const { postboxkey, signatures } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;

      const storageLayer2 = initStorageLayer();
      const tb1 = new ThresholdKey({
        serviceProvider: sp,
        storageLayer: storageLayer2,
        manualSync,
        legacyMetadataFlag: true,
      });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());

      await tb1.initialize();
      try {
        await tb1.initializeTss({
          factorPub,
          deviceTSSShare,
          deviceTSSIndex,
          serverOpts: {
            authSignatures: signatures,
          },
          tssKeyType: TSS_KEY_TYPE,
        });
        fail("should not able to initialize tss");
      } catch (e) {}
    });

    it("#should not able to support multicurve when legacy flag is true", async function () {
      const sp = TSS_KEY_TYPE === KeyType.secp256k1 ? torusSPSecp256k1 : torusSPEd25519;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "testTss@example.com";
      const { postboxkey, signatures } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;

      const storageLayer2 = initStorageLayer();
      const tb1 = new ThresholdKey({
        serviceProvider: sp,
        storageLayer: storageLayer2,
        manualSync,
        legacyMetadataFlag: true,
      });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());

      await tb1.initialize();

      // initialize with matching curve
      await tb1.initializeTss({
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE,
      });

      // try to enable multicurve
      try {
        await tb1.initializeTss({
          factorPub,
          deviceTSSShare,
          deviceTSSIndex,
          serverOpts: {
            authSignatures: signatures,
          },
          tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
        });
        fail("should not able to initialize tss");
      } catch (e) {}
    });
  });
};

failTestCases({
  TSS_KEY_TYPE: KeyType.ed25519,
});
failTestCases({
  TSS_KEY_TYPE: KeyType.secp256k1,
});

// multicurve tests that fail on legacy flag is true
