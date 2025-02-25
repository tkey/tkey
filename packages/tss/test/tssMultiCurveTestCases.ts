import { EllipticPoint, KeyType, Point } from "@tkey/common-types";
import { randomId } from "@toruslabs/customauth";
import { getEcCurve } from "@toruslabs/torus.js";
import assert, { equal, fail, rejects } from "assert";
import BN from "bn.js";
import { ec as EC } from "elliptic";

import { TKeyTSS as ThresholdKey, TKeyTSS, TSSTorusServiceProvider } from "../src";
import { factorKeyCurve, TKeyTSSInitArgs, TSS_TAG_DEFAULT } from "../src/tss";
import { getLagrangeCoeffs } from "../src/util";
import { assignTssDkgKeys, fetchPostboxKeyAndSigs, generateKey, initStorageLayer } from "./helpers";

const multiCurveTestCases = (params: { TSS_KEY_TYPE: KeyType; legacyFlag: boolean; spSecp256k1: boolean; verifierId: string }) => {
  const { TSS_KEY_TYPE, legacyFlag, spSecp256k1, verifierId } = params;
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

  const torusSPKeyType = new TSSTorusServiceProvider({
    customAuthArgs: {
      network: "sapphire_devnet",
      web3AuthClientId: "YOUR_CLIENT_ID",
      baseUrl: "http://localhost:3000",
      keyType: TSS_KEY_TYPE,
    },
  });

  const torusSP = spSecp256k1 ? torusSPSecp256k1 : torusSPKeyType;

  const torusSL = initStorageLayer();

  const manualSync = true;

  const initializeTssFailedScenario = async (
    tb: TKeyTSS,
    initParams: TKeyTSSInitArgs & {
      tssKeyType: KeyType;
    }
  ) => {
    const { factorPub, importKey, deviceTSSShare, deviceTSSIndex, serverOpts, tssKeyType } = initParams;
    try {
      await tb.initializeTss({
        importKey,
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts,
        tssKeyType,
      });
      fail("should not able to initialize tss using factorPub, deviceTssShare and deviceTssIndes with existing tss ");
    } catch (e) {}
    try {
      await tb.initializeTss({
        importKey,
        deviceTSSShare,
        serverOpts,
        tssKeyType,
      });
      fail("should not able to initialize tss using deviceTssShare with existing tss ");
    } catch (e) {}
    try {
      await tb.initializeTss({
        importKey,
        deviceTSSIndex,
        serverOpts,
        tssKeyType,
      });
      fail("should not able to initialize tss using deviceTssIndes with existing tss ");
    } catch (e) {}
    try {
      await tb.initializeTss({
        importKey,
        factorPub,
        serverOpts,
        tssKeyType,
      });
      fail("should not able to initialize tss using factorPub with existing tss ");
    } catch (e) {}
  };

  describe(`TSS MultiCurve tests, keyType=${TSS_KEY_TYPE}, legacyMetadata=${legacyFlag}, spSecp256k1=${spSecp256k1}`, function () {
    it("#should be able to reconstruct tss share from factor key", async function () {
      const sp = torusSP;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = verifierId;
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
        legacyMetadataFlag: legacyFlag,
      });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());

      await tb1.initialize();
      await tb1.initializeTss({
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE,
      });

      await initializeTssFailedScenario(tb1, {
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
      });

      await tb1.initializeTss({
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
      });

      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.secp256k1Key.cmp(reconstructedKey.secp256k1Key) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: tss2 } = await tb1.getTSSShare(factorKey, { keyType: TSS_KEY_TYPE });

      // compute public key of the tss share
      const tss2Pub = ecTSS.g.mul(tss2);

      // get tss pub key from tss commits
      const tssCommits = tb1.getTSSCommits(TSS_KEY_TYPE);
      const tssCommitA0 = tssCommits[0].toEllipticPoint(ecTSS);
      const tssCommitA1 = tssCommits[1].toEllipticPoint(ecTSS);

      // compute public key of the tss share using tss commits and tss index
      const _tss2Pub = tssCommitA0.add(tssCommitA1.mul(new BN(deviceTSSIndex)));
      equal(tss2Pub.eq(_tss2Pub), true);
    });

    it("#should be able to reconstruct tss key from factor key", async function () {
      const sp = torusSP;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "test181@example.com";

      const { serverDKGPrivKeys } = await assignTssDkgKeys({
        serviceProvider: torusSPKeyType,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 2,
      });

      const tss1 = new BN(serverDKGPrivKeys[0], "hex");
      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 2;
      const { postboxkey, signatures } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;
      const storageLayer = initStorageLayer();
      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync, legacyMetadataFlag: legacyFlag });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());

      await tb1.initialize();
      await tb1.initializeTss({
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE,
      });

      await initializeTssFailedScenario(tb1, {
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
      });

      await tb1.initializeTss({
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
      });

      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.secp256k1Key.cmp(reconstructedKey.secp256k1Key) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const { tssShare: tss2 } = await tb1.getTSSShare(factorKey, { keyType: TSS_KEY_TYPE });
      const tssCommits = tb1.getTSSCommits(TSS_KEY_TYPE);

      const tssPrivKey = getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], 1)
        .mul(tss1)
        .add(getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], deviceTSSIndex).mul(tss2))
        .umod(ecTSS.n);

      const tssPubKey = (ecTSS.g as EllipticPoint).mul(tssPrivKey);
      const tssCommits0 = tssCommits[0].toEllipticPoint(ecTSS);
      const tssPub = tb1.getTSSPub(TSS_KEY_TYPE).toEllipticPoint(ecTSS);
      equal(tssPubKey.eq(tssCommits0), true);
      equal(tssPub.eq(tssPubKey), true);

      // With account index.
      if (TSS_KEY_TYPE !== KeyType.ed25519) {
        const accountIndex = Math.floor(Math.random() * 99) + 1;
        const tss1Account = (() => {
          const share = new BN(serverDKGPrivKeys[0], "hex");
          const nonce = tb1.computeAccountNonce(accountIndex);
          return share.add(nonce).umod(ecTSS.n);
        })();
        const { tssShare: tss2Account } = await tb1.getTSSShare(factorKey, { accountIndex, keyType: TSS_KEY_TYPE });

        const coefficient1 = getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], 1);
        const coefficient2 = getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], deviceTSSIndex);
        const tssKey = coefficient1.mul(tss1Account).add(coefficient2.mul(tss2Account)).umod(ecTSS.n);

        const tssKeyPub = (ecTSS.g as EllipticPoint).mul(tssKey);
        const tssPubAccount = tb1.getTSSPub(TSS_KEY_TYPE, accountIndex).toEllipticPoint(ecTSS);
        equal(tssPubAccount.eq(tssKeyPub), true, "should equal account pub key");
      }
    });

    // should always start with default account
    it.skip(`#should be able to import a tss key for new account, manualSync=${manualSync}`, async function () {
      const sp = torusSP;
      sp.verifierName = "torus-test-health";
      sp.verifierId = `importeduserfresh${TSS_KEY_TYPE}@example.com`;
      const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;

      const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());

      const importTssKey = generateKey(TSS_KEY_TYPE);
      const newTSSIndex = 2;

      await tb.initialize();
      await tb.initializeTss({
        factorPub,
        importKey: importTssKey.raw,
        deviceTSSIndex: newTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE,
      });
      await tb.reconstructKey();

      await tb.importTssKey(
        { tssTag: "imported", importKey: importTssKey.raw, factorPubs: [factorPub], newTSSIndexes: [newTSSIndex], tssKeyType: TSS_KEY_TYPE },
        {
          authSignatures: signatures,
        }
      );

      await tb.syncLocalMetadataTransitions();

      // Check pub key.
      const ec = getEcCurve(TSS_KEY_TYPE);
      const importTssKeyPub = Point.fromScalar(importTssKey.scalar, ec);
      // tb.tssTag = "imported";
      const tssPub = await tb.getTSSPub(TSS_KEY_TYPE);
      assert(tssPub.equals(importTssKeyPub));

      // Check exported key.
      const exportedKey = await tb._UNSAFE_exportTssKey({
        factorKey,
        authSignatures: signatures,
        keyType: TSS_KEY_TYPE,
      });
      assert(exportedKey.eq(importTssKey.scalar));
      if (TSS_KEY_TYPE === KeyType.ed25519) {
        tb.setTssTag(TSS_TAG_DEFAULT);
        const seed = await tb._UNSAFE_exportTssEd25519Seed({
          factorKey,
          authSignatures: signatures,
        });
        assert(seed.equals(importTssKey.raw));
      } else {
        // If not ed25519, then also check exporting with account index.
        const exportedKeyIndex2 = await tb._UNSAFE_exportTssKey({
          factorKey,
          authSignatures: signatures,
          accountIndex: 2,
          keyType: TSS_KEY_TYPE,
        });
        const exportedPubKeyIndex2 = Point.fromScalar(exportedKeyIndex2, ec);
        const pubKeyIndex2 = tb.getTSSPub(TSS_KEY_TYPE, 2);
        assert(exportedPubKeyIndex2.equals(pubKeyIndex2));
      }
    });

    it(`#should be able to import a tss key for existing account, manualSync=${manualSync}`, async function () {
      const sp = torusSP;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 2;
      const newTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = `importeduser${TSS_KEY_TYPE}@example.com`;
      const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;
      const { serverDKGPrivKeys } = await assignTssDkgKeys({
        serviceProvider: torusSPKeyType,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });

      const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());
      // 2/2
      await tb.initialize();

      // import key
      const { raw: importedKey0 } = generateKey(TSS_KEY_TYPE);

      await tb.initializeTss({
        tssKeyType: TSS_KEY_TYPE,
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        importKey: TSS_KEY_TYPE === KeyType.ed25519 ? importedKey0 : undefined,
        serverOpts: {
          authSignatures: signatures,
        },
      });

      await initializeTssFailedScenario(tb, {
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
      });

      await tb.initializeTss({
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
      });

      const newShare = await tb.generateNewShare();

      const reconstructedKey = await tb.reconstructKey();
      await tb.syncLocalMetadataTransitions();

      if (tb.secp256k1Key.cmp(reconstructedKey.secp256k1Key) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb.getTSSShare(factorKey, {
        keyType: TSS_KEY_TYPE,
      });
      const tssCommits = tb.getTSSCommits(TSS_KEY_TYPE);
      const tssPrivKey = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], 1)
        .mul(serverDKGPrivKeys[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
        .umod(ecTSS.n);
      const tssPubKey = (ecTSS.g as EllipticPoint).mul(tssPrivKey);

      const tssCommits0 = tssCommits[0].toEllipticPoint(ecTSS);
      equal(tssPubKey.eq(tssCommits0), true);

      const { serverDKGPrivKeys: serverDKGPrivKeys1 } = await assignTssDkgKeys({
        tssTag: "imported",
        serviceProvider: torusSPKeyType,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });

      // import key
      const { raw: importedKey, scalar: importedScalar } = generateKey(TSS_KEY_TYPE);
      await tb.importTssKey(
        { tssTag: "imported", importKey: importedKey, factorPubs: [factorPub], newTSSIndexes: [newTSSIndex], tssKeyType: TSS_KEY_TYPE },
        {
          authSignatures: signatures,
        }
      );

      // tag is switched to imported
      await tb.syncLocalMetadataTransitions();

      // for imported key
      const { tssShare: retrievedTSS1, tssIndex: retrievedTSSIndex1 } = await tb.getTSSShare(factorKey, {
        keyType: TSS_KEY_TYPE,
      });

      const tssCommits1 = tb.getTSSCommits(TSS_KEY_TYPE);
      const tssPrivKey1 = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex1], 1)
        .mul(serverDKGPrivKeys1[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex1], retrievedTSSIndex1).mul(retrievedTSS1))
        .umod(ecTSS.n);
      const tssPubKey1 = (ecTSS.g as EllipticPoint).mul(tssPrivKey1);

      const tssCommits10 = tssCommits1[0].toEllipticPoint(ecTSS);
      equal(tssPubKey1.eq(tssCommits10), true);
      equal(tssPrivKey1.toString("hex"), importedScalar.toString("hex"));

      if (TSS_KEY_TYPE === KeyType.ed25519) {
        const seed = await tb._UNSAFE_exportTssEd25519Seed({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
        });
        equal(seed.equals(importedKey), true);
      }

      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

      await tb2.initialize();

      tb2.inputShareStore(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      const reconstructedKey2 = await tb2.reconstructKey();
      await tb2.syncLocalMetadataTransitions();

      if (tb2.secp256k1Key.cmp(reconstructedKey2.secp256k1Key) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const tssCommits2 = tb2.getTSSCommits(TSS_KEY_TYPE);
      const tssCommits20 = tssCommits2[0].toEllipticPoint(ecTSS);
      equal(tssPubKey.eq(tssCommits20), true);

      // switch to imported account
      tb2.setTssTag("imported");
      const { tssShare: retrievedTSSImported, tssIndex: retrievedTSSIndexImported } = await tb2.getTSSShare(factorKey, {
        keyType: TSS_KEY_TYPE,
      });

      const tssCommitsImported = tb2.getTSSCommits(TSS_KEY_TYPE);

      const tssPrivKeyImported = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndexImported], 1)
        .mul(serverDKGPrivKeys1[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndexImported], retrievedTSSIndexImported).mul(retrievedTSSImported))
        .umod(ecTSS.n);

      const tssPubKeyImported = (ecTSS.g as EllipticPoint).mul(tssPrivKeyImported);

      const tssCommitsImported0 = tssCommitsImported[0].toEllipticPoint(ecTSS);
      equal(tssPubKeyImported.eq(tssCommitsImported0), true);
      equal(tssPrivKeyImported.toString("hex"), importedScalar.toString("hex"));
    });

    it(`#should be able to unsafe export final tss key, manualSync=${manualSync}`, async function () {
      const sp = torusSP;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = `exportUser${TSS_KEY_TYPE}@example.com`;
      const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;
      const { serverDKGPrivKeys } = await assignTssDkgKeys({
        serviceProvider: torusSPKeyType,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });

      const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromElliptic(factorKeyPair.getPublic());

      // 2/2
      await tb.initialize();
      await tb.initializeTss({ factorPub, deviceTSSShare, deviceTSSIndex, tssKeyType: TSS_KEY_TYPE, serverOpts: { authSignatures: signatures } });
      await initializeTssFailedScenario(tb, {
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
        factorPub,
        deviceTSSShare,
        deviceTSSIndex,
        serverOpts: {
          authSignatures: signatures,
        },
      });

      // multicurve -
      await tb.initializeTss({
        serverOpts: {
          authSignatures: signatures,
        },
        tssKeyType: TSS_KEY_TYPE === KeyType.secp256k1 ? KeyType.ed25519 : KeyType.secp256k1,
      });

      const newShare = await tb.generateNewShare();

      const reconstructedKey = await tb.reconstructKey();
      await tb.syncLocalMetadataTransitions();

      if (tb.secp256k1Key.cmp(reconstructedKey.secp256k1Key) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb.getTSSShare(factorKey, {
        keyType: TSS_KEY_TYPE,
      });
      const tssCommits = tb.getTSSCommits(TSS_KEY_TYPE);
      const tssPrivKey = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], 1)
        .mul(serverDKGPrivKeys[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
        .umod(ecTSS.n);
      const tssPubKey = (ecTSS.g as EllipticPoint).mul(tssPrivKey);

      const tssCommits0 = tssCommits[0].toEllipticPoint(ecTSS);
      equal(tssPubKey.eq(tssCommits0), true);

      await assignTssDkgKeys({
        tssTag: "imported",
        serviceProvider: torusSPKeyType,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });
      // import key
      const { raw: importedKey, scalar: importedScalar } = generateKey(TSS_KEY_TYPE);
      const importedIndex = 2;
      // import ??
      await tb.importTssKey(
        { tssTag: "imported", importKey: importedKey, factorPubs: [factorPub], newTSSIndexes: [importedIndex], tssKeyType: TSS_KEY_TYPE },
        {
          authSignatures: signatures,
        }
      );

      // tag is switched to imported
      await tb.syncLocalMetadataTransitions();

      // for imported key
      {
        tb.setTssTag("imported");
        const finalPubKey = tb.getTSSCommits(TSS_KEY_TYPE)[0].toEllipticPoint(ecTSS);

        const finalTssKey = await tb._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
          keyType: TSS_KEY_TYPE,
        });
        const tssPubKeyImported = (ecTSS.g as EllipticPoint).mul(importedScalar);

        equal(finalTssKey.toString("hex"), importedScalar.toString("hex"));
        equal(tssPubKeyImported.eq(finalPubKey), true);

        if (TSS_KEY_TYPE === KeyType.ed25519) {
          const seed = await tb._UNSAFE_exportTssEd25519Seed({
            factorKey,
            selectedServers: [3, 4, 5],
            authSignatures: signatures,
          });
          equal(seed.equals(importedKey), true);
        }
      }
      {
        tb.setTssTag(TSS_TAG_DEFAULT);

        const finalPubKey = tb.getTSSCommits(TSS_KEY_TYPE)[0].toEllipticPoint(ecTSS);

        const finalTssKey = await tb._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
          keyType: TSS_KEY_TYPE,
        });

        const tssPubKeyImported = (ecTSS.g as EllipticPoint).mul(finalTssKey);

        equal(tssPubKeyImported.eq(finalPubKey), true);
      }
      // login to new instance
      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

      await tb2.initialize();
      tb2.inputShareStore(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      await tb2.reconstructKey();

      {
        tb2.setTssTag("imported");
        const finalPubKey = tb2.getTSSCommits(TSS_KEY_TYPE)[0].toEllipticPoint(ecTSS);

        const finalTssKey = await tb2._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
          keyType: TSS_KEY_TYPE,
        });
        const tssPubKeyImported = (ecTSS.g as EllipticPoint).mul(finalTssKey);

        equal(finalTssKey.toString("hex"), importedScalar.toString("hex"));
        equal(tssPubKeyImported.eq(finalPubKey), true);
      }
      {
        const finalPubKey = tb2.getTSSCommits(TSS_KEY_TYPE)[0].toEllipticPoint(ecTSS);

        const finalTssKey = await tb2._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
          keyType: TSS_KEY_TYPE,
        });
        const tssPubKeyImported = (ecTSS.g as EllipticPoint).mul(finalTssKey);

        equal(tssPubKeyImported.eq(finalPubKey), true);
      }
    });

    describe(`factor addition and removal, manualSync=${manualSync}`, function () {
      let tb: TKeyTSS;
      let factorKey: BN;
      let newFactorKeySameIndex: BN;
      let newFactorKeyNewIndex: BN;
      let signatures: string[];

      const deviceTSSIndex = 2;
      const newTSSIndex = 3;

      before("setup", async function () {
        const sp = torusSP;
        sp.verifierName = "torus-test-health";
        sp.verifierId = `test192${TSS_KEY_TYPE}@example.com`;
        const { signatures: authSignatures, postboxkey } = await fetchPostboxKeyAndSigs({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
        });
        signatures = authSignatures;
        sp.postboxKey = postboxkey;
        await assignTssDkgKeys({
          serviceProvider: torusSPKeyType,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 4,
        });

        tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

        // factor key needs to passed from outside of tKey
        const factorKeyPair = ecFactor.genKeyPair();
        factorKey = factorKeyPair.getPrivate();
        const factorPub = Point.fromElliptic(factorKeyPair.getPublic());
        const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
        await tb.initialize();
        await tb.initializeTss({
          factorPub,
          deviceTSSShare,
          deviceTSSIndex,
          tssKeyType: TSS_KEY_TYPE,
          serverOpts: { authSignatures },
        });
        const reconstructedKey = await tb.reconstructKey();
        await tb.syncLocalMetadataTransitions();

        if (tb.secp256k1Key.cmp(reconstructedKey.secp256k1Key) !== 0) {
          fail("key should be able to be reconstructed");
        }
      });

      it("should be able to add factor for same index", async function () {
        newFactorKeySameIndex = ecFactor.genKeyPair().getPrivate();
        const newFactorPub = (ecFactor.g as EllipticPoint).mul(newFactorKeySameIndex);
        await tb.addFactorPub({
          authSignatures: signatures,
          existingFactorKey: factorKey,
          newFactorPub: Point.fromElliptic(newFactorPub),
          newTSSIndex: deviceTSSIndex,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should be able to add factor for different index", async function () {
        newFactorKeyNewIndex = ecFactor.genKeyPair().getPrivate();
        const newFactorPub = (ecFactor.g as EllipticPoint).mul(newFactorKeyNewIndex);
        await tb.addFactorPub({
          authSignatures: signatures,
          existingFactorKey: factorKey,
          newFactorPub: Point.fromElliptic(newFactorPub),
          newTSSIndex,
          refreshShares: true,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should be able to remove factor for same index", async function () {
        const newFactorPub = (ecFactor.g as EllipticPoint).mul(newFactorKeySameIndex);
        await tb.deleteFactorPub({
          factorKey,
          deleteFactorPub: Point.fromElliptic(newFactorPub),
          authSignatures: signatures,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should no longer be able to access key share with removed factor (same index)", async function () {
        await rejects(tb.getTSSShare(newFactorKeySameIndex, { keyType: TSS_KEY_TYPE }));
      });

      it("should be able to remove factor for different index", async function () {
        const newFactorPub = (ecFactor.g as EllipticPoint).mul(newFactorKeyNewIndex);
        await tb.deleteFactorPub({
          factorKey,
          deleteFactorPub: Point.fromElliptic(newFactorPub),
          authSignatures: signatures,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should no longer be able to access key share with removed factor (different index)", async function () {
        await rejects(tb.getTSSShare(newFactorKeyNewIndex, { keyType: TSS_KEY_TYPE }));
      });
    });

    describe(`TSS serialization and deserialization tests, manualSync=${manualSync}`, function () {
      let tb: TKeyTSS;
      let factorKey: BN;
      let signatures: string[];

      const deviceTSSIndex = 2;
      const newTSSIndex = 3;

      const sp = torusSP;

      before("setup", async function () {
        sp.verifierName = "torus-test-health";
        sp.verifierId = `test193${TSS_KEY_TYPE}@example.com`;
        const { signatures: authSignatures, postboxkey } = await fetchPostboxKeyAndSigs({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
        });
        signatures = authSignatures;
        // eslint-disable-next-line require-atomic-updates
        sp.postboxKey = postboxkey;

        await assignTssDkgKeys({
          serviceProvider: torusSPKeyType,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 4,
        });

        tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, legacyMetadataFlag: legacyFlag });

        // factor key needs to passed from outside of tKey
        const factorKeyPair = ecFactor.genKeyPair();
        factorKey = factorKeyPair.getPrivate();
        const factorPub = Point.fromElliptic(factorKeyPair.getPublic());
        const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
        await tb.initialize();
        await tb.initializeTss({
          factorPub,
          deviceTSSShare,
          deviceTSSIndex,
          tssKeyType: TSS_KEY_TYPE,
          serverOpts: { authSignatures },
        });
        const reconstructedKey = await tb.reconstructKey();
        await tb.syncLocalMetadataTransitions();

        if (tb.secp256k1Key.cmp(reconstructedKey.secp256k1Key) !== 0) {
          fail("key should be able to be reconstructed");
        }
      });

      it("should be able to serialize and deserialize", async function () {
        const serialized = JSON.stringify(tb);
        const serializedSp = JSON.stringify(tb.serviceProvider);
        const spJson = TSSTorusServiceProvider.fromJSON(JSON.parse(serializedSp));

        // we are using mocked storage layer for local testing
        // const slJson = TorusStorageLayer.fromJSON(JSON.parse(serializedTorusSL));

        const tbJson = await ThresholdKey.fromJSON(JSON.parse(serialized), {
          serviceProvider: spJson,
          storageLayer: torusSL,
          manualSync,
        });
        // reconstruct metdata key
        await tbJson.reconstructKey();

        // try refresh share
        await tbJson.getTSSShare(factorKey, { keyType: TSS_KEY_TYPE });

        const newFactorKeyPair = ecFactor.genKeyPair();
        await tbJson.addFactorPub({
          authSignatures: signatures,
          existingFactorKey: factorKey,
          newFactorPub: Point.fromElliptic(newFactorKeyPair.getPublic()),
          newTSSIndex,
          refreshShares: true,
        });

        await tbJson.getTSSShare(newFactorKeyPair.getPrivate(), { keyType: TSS_KEY_TYPE });

        const serialized2 = JSON.stringify(tbJson);

        const tbJson2 = await ThresholdKey.fromJSON(JSON.parse(serialized2), {
          serviceProvider: sp,
          storageLayer: torusSL,
          manualSync,
        });

        await tbJson2.reconstructKey();

        await tbJson2.getTSSShare(factorKey, { keyType: TSS_KEY_TYPE });
        await tbJson2.getTSSShare(newFactorKeyPair.getPrivate(), { keyType: TSS_KEY_TYPE });
      });
    });
  });
};

const TEST_KEY_TYPES = [KeyType.secp256k1, KeyType.ed25519];

// MultiCurve only supported for secp256k1 service provider and legacy flag is false
TEST_KEY_TYPES.forEach((TSS_KEY_TYPE) => {
  multiCurveTestCases({
    TSS_KEY_TYPE,
    legacyFlag: false,
    spSecp256k1: true,
    verifierId: randomId(),
  });
});
