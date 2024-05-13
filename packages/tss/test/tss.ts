import { FACTOR_KEY_TYPE, KeyType, keyTypeToCurve, Point } from "@tkey/common-types";
import { equal, fail, rejects } from "assert";
import BN from "bn.js";

import { TKeyTSS as ThresholdKey, TKeyTSS, TSSTorusServiceProvider } from "../src";
import { BasePoint, getLagrangeCoeffs, pointToElliptic } from "../src/util";
import { assignTssDkgKeys, fetchPostboxKeyAndSigs, generateKey, initStorageLayer } from "./helpers";

const TEST_KEY_TYPES = [KeyType.secp256k1, KeyType.ed25519];

TEST_KEY_TYPES.forEach((KEY_TYPE) => {
  const ecFactor = keyTypeToCurve(FACTOR_KEY_TYPE);
  const ecTSS = keyTypeToCurve(KEY_TYPE);

  const torusSP = new TSSTorusServiceProvider({
    customAuthArgs: {
      network: "sapphire_devnet",
      web3AuthClientId: "YOUR_CLIENT_ID",
      baseUrl: "http://localhost:3000",
    },
    keyType: KEY_TYPE,
  });

  const torusSL = initStorageLayer();

  const manualSync = true;

  describe(`TSS tests, keyType=${KEY_TYPE}`, function () {
    it("#should be able to reconstruct tss share from factor key", async function () {
      const sp = torusSP;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "test@example.com";
      const { postboxkey } = await fetchPostboxKeyAndSigs({
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
        keyType: KEY_TYPE,
      });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromSEC1(factorKeyPair.getPublic().encodeCompressed("hex"), FACTOR_KEY_TYPE);

      await tb1.initialize({ factorPub, deviceTSSShare, deviceTSSIndex });
      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: tss2 } = await tb1.getTSSShare(factorKey);

      const tssCommits = tb1.getTSSCommits();
      const tss2Pub = ecTSS.g.mul(tss2);
      const tssCommitA0 = pointToElliptic(ecTSS, tssCommits[0]);
      const tssCommitA1 = pointToElliptic(ecTSS, tssCommits[1]);
      const _tss2Pub = tssCommitA0.add(tssCommitA1.mul(new BN(deviceTSSIndex)));
      equal(tss2Pub.eq(_tss2Pub), true);
    });

    it("#should be able to reconstruct tss key from factor key", async function () {
      const sp = torusSP;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "test18@example.com";
      const { serverDKGPrivKeys } = await assignTssDkgKeys({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 2,
      });

      const tss1 = new BN(serverDKGPrivKeys[0], "hex");
      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 2;
      const { postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;
      const storageLayer = initStorageLayer();
      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync, keyType: KEY_TYPE });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromSEC1(factorKeyPair.getPublic().encodeCompressed("hex"), FACTOR_KEY_TYPE);

      await tb1.initialize({ factorPub, deviceTSSShare, deviceTSSIndex });
      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const { tssShare: tss2 } = await tb1.getTSSShare(factorKey);
      const tssCommits = tb1.getTSSCommits();

      const tssPrivKey = getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], 1)
        .mul(tss1)
        .add(getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], deviceTSSIndex).mul(tss2))
        .umod(ecTSS.n);

      const tssPubKey = (ecTSS.g as BasePoint).mul(tssPrivKey);
      const tssCommits0 = pointToElliptic(ecTSS, tssCommits[0]);
      const tssPub = pointToElliptic(ecTSS, tb1.getTSSPub());
      equal(tssPubKey.eq(tssCommits0), true);
      equal(tssPub.eq(tssPubKey), true);

      // With account index.
      if (tb1.keyType !== KeyType.ed25519) {
        const accountIndex = Math.floor(Math.random() * 99) + 1;
        const tss1Account = (() => {
          const share = new BN(serverDKGPrivKeys[0], "hex");
          const nonce = tb1.computeAccountNonce(accountIndex);
          return share.add(nonce).umod(ecTSS.n);
        })();
        const { tssShare: tss2Account } = await tb1.getTSSShare(factorKey, { accountIndex });

        const coefficient1 = getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], 1);
        const coefficient2 = getLagrangeCoeffs(ecTSS, [1, deviceTSSIndex], deviceTSSIndex);
        const tssKey = coefficient1.mul(tss1Account).add(coefficient2.mul(tss2Account)).umod(ecTSS.n);

        const tssKeyPub = (ecTSS.g as BasePoint).mul(tssKey);
        const tssPubAccount = pointToElliptic(ecTSS, tb1.getTSSPub(accountIndex));
        equal(tssPubAccount.eq(tssKeyPub), true, "should equal account pub key");
      }
    });

    it(`#should be able to import a tss key, manualSync=${manualSync}`, async function () {
      const sp = torusSP;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 2;
      const newTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = `importeduser${KEY_TYPE}@example.com`;
      const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;
      const { serverDKGPrivKeys } = await assignTssDkgKeys({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });

      const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: KEY_TYPE });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromSEC1(factorKeyPair.getPublic().encodeCompressed("hex"), FACTOR_KEY_TYPE);
      // 2/2
      await tb.initialize({ factorPub, deviceTSSShare, deviceTSSIndex });
      const newShare = await tb.generateNewShare();

      const reconstructedKey = await tb.reconstructKey();
      await tb.syncLocalMetadataTransitions();

      if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb.getTSSShare(factorKey);
      const tssCommits = tb.getTSSCommits();
      const tssPrivKey = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], 1)
        .mul(serverDKGPrivKeys[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
        .umod(ecTSS.n);
      const tssPubKey = (ecTSS.g as BasePoint).mul(tssPrivKey);

      const tssCommits0 = pointToElliptic(ecTSS, tssCommits[0]);
      equal(tssPubKey.eq(tssCommits0), true);

      const { serverDKGPrivKeys: serverDKGPrivKeys1 } = await assignTssDkgKeys({
        tssTag: "imported",
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });

      // import key
      const { raw: importedKey, scalar: importedScalar } = generateKey(KEY_TYPE);
      await tb.importTssKey(
        { tag: "imported", importKey: importedKey, factorPub, newTSSIndex },
        {
          authSignatures: signatures,
        }
      );
      // tag is switched to imported
      await tb.syncLocalMetadataTransitions();
      // for imported key
      const { tssShare: retrievedTSS1, tssIndex: retrievedTSSIndex1 } = await tb.getTSSShare(factorKey);

      const tssCommits1 = tb.getTSSCommits();
      const tssPrivKey1 = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex1], 1)
        .mul(serverDKGPrivKeys1[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex1], retrievedTSSIndex1).mul(retrievedTSS1))
        .umod(ecTSS.n);
      const tssPubKey1 = (ecTSS.g as BasePoint).mul(tssPrivKey1);

      const tssCommits10 = pointToElliptic(ecTSS, tssCommits1[0]);
      equal(tssPubKey1.eq(tssCommits10), true);
      equal(tssPrivKey1.toString("hex"), importedScalar.toString("hex"));

      if (KEY_TYPE === KeyType.ed25519) {
        const seed = await tb._UNSAFE_exportTssEd25519Seed({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
        });
        equal(seed.equals(importedKey), true);
      }

      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: KEY_TYPE });

      await tb2.initialize({ factorPub });
      tb2.inputShareStore(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      const reconstructedKey2 = await tb2.reconstructKey();
      await tb2.syncLocalMetadataTransitions();

      if (tb2.privKey.cmp(reconstructedKey2.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const tssCommits2 = tb2.getTSSCommits();
      const tssCommits20 = pointToElliptic(ecTSS, tssCommits2[0]);
      equal(tssPubKey.eq(tssCommits20), true);

      // switch to imported account
      tb2.tssTag = "imported";
      const { tssShare: retrievedTSSImported, tssIndex: retrievedTSSIndexImported } = await tb2.getTSSShare(factorKey);

      const tssCommitsImported = tb2.getTSSCommits();

      const tssPrivKeyImported = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndexImported], 1)
        .mul(serverDKGPrivKeys1[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndexImported], retrievedTSSIndexImported).mul(retrievedTSSImported))
        .umod(ecTSS.n);

      const tssPubKeyImported = (ecTSS.g as BasePoint).mul(tssPrivKeyImported);

      const tssCommitsImported0 = pointToElliptic(ecTSS, tssCommitsImported[0]);
      equal(tssPubKeyImported.eq(tssCommitsImported0), true);
      equal(tssPrivKeyImported.toString("hex"), importedScalar.toString("hex"));
    });

    it(`#should be able to unsafe export final tss key, manualSync=${manualSync}`, async function () {
      const sp = torusSP;

      const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      sp.verifierId = `exportUser${KEY_TYPE}@example.com`;
      const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;
      const { serverDKGPrivKeys } = await assignTssDkgKeys({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });

      const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: KEY_TYPE });

      // factor key needs to passed from outside of tKey
      const factorKeyPair = ecFactor.genKeyPair();
      const factorKey = factorKeyPair.getPrivate();
      const factorPub = Point.fromSEC1(factorKeyPair.getPublic().encodeCompressed("hex"), FACTOR_KEY_TYPE);

      // 2/2
      await tb.initialize({ factorPub, deviceTSSShare, deviceTSSIndex });
      const newShare = await tb.generateNewShare();

      const reconstructedKey = await tb.reconstructKey();
      await tb.syncLocalMetadataTransitions();

      if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb.getTSSShare(factorKey);
      const tssCommits = tb.getTSSCommits();
      const tssPrivKey = getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], 1)
        .mul(serverDKGPrivKeys[0])
        .add(getLagrangeCoeffs(ecTSS, [1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
        .umod(ecTSS.n);
      const tssPubKey = (ecTSS.g as BasePoint).mul(tssPrivKey);

      const tssCommits0 = pointToElliptic(ecTSS, tssCommits[0]);
      equal(tssPubKey.eq(tssCommits0), true);

      await assignTssDkgKeys({
        tssTag: "imported",
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 1,
      });
      // import key
      const { raw: importedKey, scalar: importedScalar } = generateKey(KEY_TYPE);
      const importedIndex = 2;
      await tb.importTssKey(
        { tag: "imported", importKey: importedKey, factorPub, newTSSIndex: importedIndex },
        {
          authSignatures: signatures,
        }
      );
      // tag is switched to imported
      await tb.syncLocalMetadataTransitions();
      // for imported key
      {
        const finalPubKey = pointToElliptic(ecTSS, tb.getTSSCommits()[0]);

        const finalTssKey = await tb._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
        });
        const tssPubKeyImported = (ecTSS.g as BasePoint).mul(importedScalar);

        equal(finalTssKey.toString("hex"), importedScalar.toString("hex"));
        equal(tssPubKeyImported.eq(finalPubKey), true);

        if (KEY_TYPE === KeyType.ed25519) {
          const seed = await tb._UNSAFE_exportTssEd25519Seed({
            factorKey,
            selectedServers: [3, 4, 5],
            authSignatures: signatures,
          });
          equal(seed.equals(importedKey), true);
        }
      }
      {
        tb.tssTag = "default";

        const finalPubKey = pointToElliptic(ecTSS, tb.getTSSCommits()[0]);

        const finalTssKey = await tb._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
        });
        const tssPubKeyImported = (ecTSS.g as BasePoint).mul(finalTssKey);

        equal(tssPubKeyImported.eq(finalPubKey), true);
      }

      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: KEY_TYPE });

      await tb2.initialize({ factorPub });
      tb2.inputShareStore(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      await tb2.reconstructKey();
      await tb2.syncLocalMetadataTransitions();
      {
        tb2.tssTag = "imported";
        const finalPubKey = pointToElliptic(ecTSS, tb2.getTSSCommits()[0]);

        const finalTssKey = await tb2._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
        });
        const tssPubKeyImported = (ecTSS.g as BasePoint).mul(finalTssKey);

        equal(finalTssKey.toString("hex"), importedScalar.toString("hex"));
        equal(tssPubKeyImported.eq(finalPubKey), true);
      }
      {
        tb2.tssTag = "default";

        const finalPubKey = pointToElliptic(ecTSS, tb2.getTSSCommits()[0]);

        const finalTssKey = await tb2._UNSAFE_exportTssKey({
          factorKey,
          selectedServers: [1, 2, 3],
          authSignatures: signatures,
        });
        const tssPubKeyImported = (ecTSS.g as BasePoint).mul(finalTssKey);

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
        sp.verifierId = `test192${KEY_TYPE}@example.com`;
        const { signatures: authSignatures, postboxkey } = await fetchPostboxKeyAndSigs({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
        });
        signatures = authSignatures;
        sp.postboxKey = postboxkey;
        await assignTssDkgKeys({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 4,
        });

        tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: KEY_TYPE });

        // factor key needs to passed from outside of tKey
        const factorKeyPair = ecFactor.genKeyPair();
        factorKey = factorKeyPair.getPrivate();
        const factorPub = Point.fromSEC1(factorKeyPair.getPublic().encodeCompressed("hex"), FACTOR_KEY_TYPE);
        const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
        await tb.initialize({ factorPub, deviceTSSShare, deviceTSSIndex });
        const reconstructedKey = await tb.reconstructKey();
        await tb.syncLocalMetadataTransitions();

        if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
          fail("key should be able to be reconstructed");
        }
      });

      it("should be able to add factor for same index", async function () {
        newFactorKeySameIndex = ecFactor.genKeyPair().getPrivate();
        const newFactorPub = (ecFactor.g as BasePoint).mul(newFactorKeySameIndex);
        await tb.addFactorPub({
          authSignatures: signatures,
          existingFactorKey: factorKey,
          newFactorPub: Point.fromSEC1(newFactorPub.encodeCompressed("hex"), FACTOR_KEY_TYPE),
          newTSSIndex: deviceTSSIndex,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should be able to add factor for different index", async function () {
        newFactorKeyNewIndex = ecFactor.genKeyPair().getPrivate();
        const newFactorPub = (ecFactor.g as BasePoint).mul(newFactorKeyNewIndex);
        await tb.addFactorPub({
          authSignatures: signatures,
          existingFactorKey: factorKey,
          newFactorPub: Point.fromSEC1(newFactorPub.encodeCompressed("hex"), FACTOR_KEY_TYPE),
          newTSSIndex,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should be able to remove factor for same index", async function () {
        const newFactorPub = (ecFactor.g as BasePoint).mul(newFactorKeySameIndex);
        await tb.deleteFactorPub({
          factorKey,
          deleteFactorPub: Point.fromSEC1(newFactorPub.encodeCompressed("hex"), FACTOR_KEY_TYPE),
          authSignatures: signatures,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should no longer be able to access key share with removed factor (same index)", async function () {
        await rejects(tb.getTSSShare(newFactorKeySameIndex));
      });

      it("should be able to remove factor for different index", async function () {
        const newFactorPub = (ecFactor.g as BasePoint).mul(newFactorKeyNewIndex);
        await tb.deleteFactorPub({
          factorKey,
          deleteFactorPub: Point.fromSEC1(newFactorPub.encodeCompressed("hex"), FACTOR_KEY_TYPE),
          authSignatures: signatures,
        });
        await tb.syncLocalMetadataTransitions();
      });

      it("should no longer be able to access key share with removed factor (different index)", async function () {
        await rejects(tb.getTSSShare(newFactorKeyNewIndex));
      });
    });
  });
});
