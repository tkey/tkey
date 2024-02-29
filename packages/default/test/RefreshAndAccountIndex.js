import { ecCurve, getPubKeyPoint } from "@tkey-mpc/common-types";
// eslint-disable-next-line import/no-extraneous-dependencies
import { generatePrivate } from "@toruslabs/eccrypto";
import assert, { fail, notEqual, rejects, strictEqual } from "assert";
import BN from "bn.js";

import ThresholdKey from "../src/index";
import { assignTssDkgKeys, computeIndexedPrivateKey, fetchPostboxKeyAndSigs, getMetadataUrl, initStorageLayer } from "./helpers";

const metadataURL = getMetadataUrl();
const TSS_MODULE = "tssModule";
// eslint-disable-next-line mocha/no-exports
export const refreshAndAccountIndex = (customSP, manualSync, resetAccountSalt) => {
  const mode = manualSync;
  const { useTSS } = customSP;
  describe(`RefreshAndAccountIndex : useTss ${useTSS}, manualSync ${manualSync}, bcAccountIndex ${resetAccountSalt}`, function () {
    it("#should be able to get same key each login using differnt accountIndex", async function () {
      const sp = customSP;
      if (!sp.useTSS) this.skip();

      const deviceTSSShare = new BN(generatePrivate());
      const deviceTSSIndex = 2;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "test19@example.com";
      const testId = sp.getVerifierNameVerifierId();
      const { postboxkey } = await fetchPostboxKeyAndSigs({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
      });
      sp.postboxKey = postboxkey;

      const storageLayer = initStorageLayer({ hostUrl: metadataURL });
      const tb0 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

      // accountSalt is absent, required for nonce generation
      //  can be only initialize with tkey.initialize();
      rejects(async () => {
        tb0.computeAccountNonce(1);
      });
      // factor key needs to passed from outside of tKey
      const factorKey = new BN(generatePrivate());
      const factorPub = getPubKeyPoint(factorKey);

      await tb0.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      await tb0.reconstructKey();
      // Test for backward compatibility ( accountSalt is absent for old account )

      const tss0ShareIndex0 = await tb0.getTSSShare(factorKey);
      const tss0ShareIndex1 = await tb0.getTSSShare(factorKey, { accountIndex: 1 });
      const tss0ShareIndex2 = await tb0.getTSSShare(factorKey, { accountIndex: 2 });
      const tss0ShareIndex99 = await tb0.getTSSShare(factorKey, { accountIndex: 99 });
      if (resetAccountSalt) {
        // tb0.metadata.encryptedSalt = {};
        await tb0._deleteTKeyStoreItem(TSS_MODULE, "accountSalt");
      }

      const newShare = await tb0.generateNewShare();
      await tb0.syncLocalMetadataTransitions();

      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      await tb1.inputShareStoreSafe(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      await tb1.reconstructKey();

      const tss1ShareIndex0 = await tb1.getTSSShare(factorKey);
      const tss1ShareIndex1 = await tb1.getTSSShare(factorKey, { accountIndex: 1 });
      const tss1ShareIndex2 = await tb1.getTSSShare(factorKey, { accountIndex: 2 });
      const tss1ShareIndex99 = await tb1.getTSSShare(factorKey, { accountIndex: 99 });

      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      await tb2.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      await tb2.inputShareStoreSafe(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      await tb2.reconstructKey();

      const tss2ShareIndex0 = await tb2.getTSSShare(factorKey);
      const tss2ShareIndex1 = await tb2.getTSSShare(factorKey, { accountIndex: 1 });
      const tss2ShareIndex2 = await tb2.getTSSShare(factorKey, { accountIndex: 2 });
      const tss2ShareIndex99 = await tb2.getTSSShare(factorKey, { accountIndex: 99 });

      strictEqual(tss0ShareIndex0.tssShare.toString("hex"), tss1ShareIndex0.tssShare.toString("hex"));

      // expect different account address when accountSalt is reseted ( to support existing account that do not have this features)
      if (resetAccountSalt) {
        notEqual(tss0ShareIndex1.tssShare.toString("hex"), tss1ShareIndex1.tssShare.toString("hex"));
        notEqual(tss0ShareIndex2.tssShare.toString("hex"), tss1ShareIndex2.tssShare.toString("hex"));
        notEqual(tss0ShareIndex99.tssShare.toString("hex"), tss1ShareIndex99.tssShare.toString("hex"));
      } else {
        strictEqual(tss0ShareIndex1.tssShare.toString("hex"), tss1ShareIndex1.tssShare.toString("hex"));
        strictEqual(tss0ShareIndex2.tssShare.toString("hex"), tss1ShareIndex2.tssShare.toString("hex"));
        strictEqual(tss0ShareIndex99.tssShare.toString("hex"), tss1ShareIndex99.tssShare.toString("hex"));
      }

      // expect same account address after relogin
      strictEqual(tss1ShareIndex0.tssShare.toString("hex"), tss2ShareIndex0.tssShare.toString("hex"));
      strictEqual(tss1ShareIndex1.tssShare.toString("hex"), tss2ShareIndex1.tssShare.toString("hex"));
      strictEqual(tss1ShareIndex2.tssShare.toString("hex"), tss2ShareIndex2.tssShare.toString("hex"));
      strictEqual(tss1ShareIndex99.tssShare.toString("hex"), tss2ShareIndex99.tssShare.toString("hex"));
    });

    it("#should be able to refresh tss shares", async function () {
      const sp = customSP;
      if (!sp.useTSS) this.skip();

      const deviceTSSShare = new BN(generatePrivate());
      const deviceTSSIndex = 2;

      sp.verifierName = "torus-test-health";
      sp.verifierId = "test19@example.com";
      const testId = sp.getVerifierNameVerifierId();
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
        maxTSSNonceToSimulate: 3,
      });

      const storageLayer = initStorageLayer({ hostUrl: metadataURL });
      const tb0 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

      // accountSalt is absent, required for nonce generation
      //  can be only initialize with tkey.initialize();
      rejects(async () => {
        tb0.computeAccountNonce(1);
      });
      // factor key needs to passed from outside of tKey
      const factorKey = new BN(generatePrivate());
      const factorPub = getPubKeyPoint(factorKey);

      await tb0.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      await tb0.reconstructKey();
      // Test for backward compatibility ( accountSalt is absent for old account )

      if (resetAccountSalt) {
        // eslint-disable-next-line require-atomic-updates
        tb0.metadata.encryptedSalt = {};
      }

      const newShare = await tb0.generateNewShare();
      await tb0.syncLocalMetadataTransitions();

      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });

      //   const newShare = await tb1.generateNewShare();
      await tb1.inputShareStoreSafe(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      const reconstructedKey = await tb1.reconstructKey();

      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const tssPrivKey1 = await computeIndexedPrivateKey(tb1, factorKey, serverDKGPrivKeys[0], 1);
      const tssPubKeyIndex0 = ecCurve.keyFromPrivate(tssPrivKey1).getPublic();

      const pubKey1 = tb1.getTSSPub(1);
      strictEqual(tssPubKeyIndex0.x.toString(16, 64), pubKey1.x.toString(16, 64));
      strictEqual(tssPubKeyIndex0.y.toString(16, 64), pubKey1.y.toString(16, 64));

      const factorKey1 = new BN(generatePrivate());
      const factorPub1 = getPubKeyPoint(factorKey1);

      const factorPubs1 = [factorPub, factorPub1];
      const { serverEndpoints, serverPubKeys } = await sp.getRSSNodeDetails();
      const { tssShare: retrievedTSSShare1, tssIndex: retrievedTSSIdx1 } = await tb1.getTSSShare(factorKey);
      await tb1._refreshTSSShares(true, retrievedTSSShare1, retrievedTSSIdx1, factorPubs1, [2, 3], testId, {
        serverThreshold: 3,
        selectedServers: [1, 2, 3],
        serverEndpoints,
        serverPubKeys,
        authSignatures: signatures,
      });
      if (manualSync) {
        await tb1.syncLocalMetadataTransitions();
      }
      const tssPrivKeyIndex1 = await computeIndexedPrivateKey(tb1, factorKey, serverDKGPrivKeys[1], 1);
      const tssPrivKeyIndex2 = await computeIndexedPrivateKey(tb1, factorKey, serverDKGPrivKeys[1], 2);

      const tssPubKeyIndex1 = ecCurve.keyFromPrivate(tssPrivKeyIndex1).getPublic();

      const pubKeyIndex1 = tb1.getTSSPub(1);
      strictEqual(tssPubKeyIndex1.x.toString(16, 64), pubKeyIndex1.x.toString(16, 64));
      strictEqual(tssPubKeyIndex1.y.toString(16, 64), pubKeyIndex1.y.toString(16, 64));

      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      await tb2.initialize({ useTSS: true, factorPub });
      await tb2.inputShareStoreSafe(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      await tb2.reconstructKey();

      const tssPrivKeytb2Index2 = await computeIndexedPrivateKey(tb2, factorKey, serverDKGPrivKeys[1], 2);
      strictEqual(tssPrivKeyIndex2.toString("hex"), tssPrivKeytb2Index2.toString("hex"));

      const tssPubKeytb2Index2 = getPubKeyPoint(tssPrivKeytb2Index2);
      const pubKey2Index2 = tb2.getTSSPub(2);

      strictEqual(tssPubKeytb2Index2.x.toString(16, 64), pubKey2Index2.x.toString(16, 64));
      strictEqual(tssPubKeytb2Index2.y.toString(16, 64), pubKey2Index2.y.toString(16, 64));

      // // test tss refresh
      const factorKey2 = new BN(generatePrivate());
      const factorPub2 = getPubKeyPoint(factorKey2);

      const factorPubs2 = [factorPub, factorPub2];
      const { tssShare: retrievedTSS3, tssIndex: retrievedTSSIndex3 } = await tb2.getTSSShare(factorKey);
      await tb2._refreshTSSShares(true, retrievedTSS3, retrievedTSSIndex3, factorPubs2, [2, 3], testId, {
        serverThreshold: 3,
        selectedServers: [1, 2, 3],
        serverEndpoints,
        serverPubKeys,
        authSignatures: signatures,
      });

      {
        // ensure tssShare is the master share
        const { tssShare } = await tb2.getTSSShare(factorKey);
        const { tssShare: tssShareIndex1 } = await tb2.getTSSShare(factorKey, { accountIndex: 1 });
        const { tssShare: tssShareIndex2 } = await tb2.getTSSShare(factorKey, { accountIndex: 2 });
        const { tssShare: tssShareIndex0 } = await tb2.getTSSShare(factorKey, { accountIndex: 0 });

        const nonce1 = tb2.computeAccountNonce(1);
        const nonce2 = tb2.computeAccountNonce(2);

        assert(tb2.computeAccountNonce(0).eq(new BN(0)), "nonce for account 0 should be 0");
        assert(tssShare.eq(tssShareIndex0), "tssShareIndex0 should be equal to tssShare");
        assert(tssShare.add(nonce1).umod(ecCurve.n).eq(tssShareIndex1), "tssShareIndex1 should be equal to tssShare + nonce1");
        assert(tssShare.add(nonce2).umod(ecCurve.n).eq(tssShareIndex2), "tssShareIndex2 should be equal to tssShare + nonce2");
        assert(!tssShareIndex1.add(nonce1).umod(ecCurve.n).eq(tssShareIndex2), "tssShareIndex2 should not be equal to tssShareIndex1 + nonce1");
      }
      // test case to ensure nonce mechanism
      {
        // make sure derived pub key is different from the index 0 key
        notEqual(tssPubKeyIndex0.x.toString(16, 64), tssPubKeytb2Index2.x.toString(16, 64));
        notEqual(tssPubKeyIndex0.y.toString(16, 64), tssPubKeytb2Index2.y.toString(16, 64));

        const { tssShare: retrievedTSS } = await tb2.getTSSShare(factorKey);
        const tssSharePub = ecCurve.keyFromPrivate(retrievedTSS.toString("hex")).getPublic();
        const { tssShare: retrievedTSSIndex1 } = await tb2.getTSSShare(factorKey, { accountIndex: 1 });
        const tssSharePubIndex1 = ecCurve.keyFromPrivate(retrievedTSSIndex1.toString("hex")).getPublic();

        const nonce = tb2.computeAccountNonce(1);
        const noncePub = ecCurve.keyFromPrivate(nonce.toString("hex")).getPublic();
        const tssShareDerived = tssSharePub.add(noncePub);

        strictEqual(tssShareDerived.getX().toString("hex"), tssSharePubIndex1.getX().toString("hex"));
        strictEqual(tssShareDerived.getY().toString("hex"), tssSharePubIndex1.getY().toString("hex"));

        const { tssShare: retrievedTSS31 } = await tb2.getTSSShare(factorKey, { accountIndex: 2 });
        const tssSharePub3 = ecCurve.keyFromPrivate(retrievedTSS31.toString("hex")).getPublic();
        const nonce2 = tb2.computeAccountNonce(2);
        const noncePub2 = ecCurve.keyFromPrivate(nonce2.toString("hex")).getPublic();
        const tssShareDerived2 = tssSharePub.add(noncePub2);
        strictEqual(tssShareDerived2.getX().toString("hex"), tssSharePub3.getX().toString("hex"));
        strictEqual(tssShareDerived2.getY().toString("hex"), tssSharePub3.getY().toString("hex"));
      }

      // check for account 1 and 2 after refresh share ( tb1 only refresh once )
      {
        const computedKey = await computeIndexedPrivateKey(tb1, factorKey, serverDKGPrivKeys[1], 1);
        strictEqual(tssPrivKey1.toString(16, 64), computedKey.toString(16, 64));
      }

      {
        const computedKey = await computeIndexedPrivateKey(tb1, factorKey, serverDKGPrivKeys[1], 2);
        strictEqual(tssPrivKeyIndex2.toString(16, 64), computedKey.toString(16, 64));
      }

      // check for account 1 and 2 after refresh share ( tb2 only refresh twice )
      {
        const computedKey = await computeIndexedPrivateKey(tb2, factorKey2, serverDKGPrivKeys[2], 1);
        strictEqual(tssPrivKey1.toString(16, 64), computedKey.toString(16, 64));
      }

      {
        const computedKey = await computeIndexedPrivateKey(tb2, factorKey2, serverDKGPrivKeys[2], 2);
        strictEqual(tssPrivKeytb2Index2.toString(16, 64), computedKey.toString(16, 64));
      }
    });
  });
};
