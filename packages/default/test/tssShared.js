/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable import/no-extraneous-dependencies */

import { ecCurve, getPubKeyPoint, KEY_NOT_FOUND, SHARE_DELETED } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { getLagrangeCoeffs } from "@toruslabs/rss-client";
import { deepEqual, deepStrictEqual, equal, fail, notEqual, notStrictEqual, rejects, strict, strictEqual, throws } from "assert";
import BN from "bn.js";
import stringify from "json-stable-stringify";
import { keccak256 } from "web3-utils";

import ThresholdKey from "../src/index";
import { generateVerifierId, getMetadataUrl, setupTSS } from "./helpers";
const metadataURL = getMetadataUrl();

// eslint-disable-next-line mocha/no-exports
export const tssSharedTests = (mode, torusSP, storageLayer, MOCK_RSS) => {
  const customSP = torusSP;
  const customSL = storageLayer;
  let verifierId;

  before(function () {
    verifierId = generateVerifierId();
    console.log(verifierId)
  });

  describe.only("TSS tests", function () {
    it("#should be able to refresh tss shares", async function () {
      const sp = customSP;
      if (!sp.useTSS) this.skip();

      const deviceTSSShare = new BN(generatePrivate());
      const deviceTSSIndex = 2;

      sp.verifierName = "torus-test-health";
      // expect new account, use new random verifierId
      sp.verifierId = generateVerifierId();
      const { signatures, serverDKGPrivKeys } = await setupTSS({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 2,
        tssTag: "default",
        MOCK_RSS,
      });

      const testId = sp.getVerifierNameVerifierId();
      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      // factor key needs to passed from outside of tKey
      const factorKey = new BN(generatePrivate());
      const factorPub = getPubKeyPoint(factorKey);

      await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      await tb1.reconstructKey();
      const newShare = await tb1.generateNewShare();
      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      await tb2.initialize({ useTSS: true, factorPub });
      tb2.inputShareStore(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
      await tb2.reconstructKey();
      const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb2.getTSSShare(factorKey);
      const tssCommits = tb2.getTSSCommits();
      const tssPrivKey = getLagrangeCoeffs([1, retrievedTSSIndex], 1)
        .mul(serverDKGPrivKeys[0])
        .add(getLagrangeCoeffs([1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
        .umod(ecCurve.n);

      const tssPubKey = getPubKeyPoint(tssPrivKey);
      strictEqual(tssPubKey.x.toString(16, 64), tssCommits[0].x.toString(16, 64));
      strictEqual(tssPubKey.y.toString(16, 64), tssCommits[0].y.toString(16, 64));

      // // test tss refresh

      const factorKey2 = new BN(generatePrivate());
      const factorPub2 = getPubKeyPoint(factorKey2);

      const factorPubs = [factorPub, factorPub2];
      const { serverEndpoints, serverPubKeys } = await sp.getRSSNodeDetails();
      await tb2._refreshTSSShares(true, retrievedTSS, retrievedTSSIndex, factorPubs, [2, 3], testId, {
        serverThreshold: 3,
        selectedServers: [1, 2, 3],
        serverEndpoints,
        serverPubKeys,
        authSignatures: signatures,
      });

      {
        const { tssShare: newTSS2, tssIndex } = await tb2.getTSSShare(factorKey);
        const newTSSPrivKey = getLagrangeCoeffs([1, 2], 1)
          .mul(new BN(serverDKGPrivKeys[1], "hex"))
          .add(getLagrangeCoeffs([1, 2], 2).mul(newTSS2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
        // eslint-disable-next-line no-console
        console.log("newTSS2", newTSS2.toString("hex"), tssIndex);
      }

      {
        const { tssShare: newTSS2, tssIndex } = await tb2.getTSSShare(factorKey2);
        const newTSSPrivKey = getLagrangeCoeffs([1, 3], 1)
          .mul(new BN(serverDKGPrivKeys[1], "hex"))
          .add(getLagrangeCoeffs([1, 3], 3).mul(newTSS2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
        // eslint-disable-next-line no-console
        console.log("newTSS2", newTSS2.toString("hex"), tssIndex);
      }
    });
    it("#should be able to reconstruct tssShare from factor key (tss2) when initializing a key with useTSS true", async function () {
      const sp = customSP;
      if (!sp.useTSS) this.skip();

      const deviceTSSShare = new BN(generatePrivate());
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      // expect new account, use new random verifierId
      sp.verifierId = generateVerifierId();
      // const { postboxkey } = await fetchPostboxKeyAndSigs({
      //   serviceProvider: sp,
      //   verifierName: sp.verifierName,
      //   verifierId: sp.verifierId,
      // });
      // sp.postboxKey = postboxkey;
      await setupTSS({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 2,
        tssTag: "default",
        MOCK_RSS,
      });

      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

      // factor key needs to passed from outside of tKey
      const factorKey = new BN(generatePrivate());
      const factorPub = getPubKeyPoint(factorKey);

      await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const { tssShare: tss2 } = await tb1.getTSSShare(factorKey);

      const tssCommits = tb1.getTSSCommits();
      const tss2Pub = ecCurve.g.mul(tss2);
      const tssCommitA0 = ecCurve.keyFromPublic({ x: tssCommits[0].x.toString(16, 64), y: tssCommits[0].y.toString(16, 64) }).getPublic();
      const tssCommitA1 = ecCurve.keyFromPublic({ x: tssCommits[1].x.toString(16, 64), y: tssCommits[1].y.toString(16, 64) }).getPublic();
      const _tss2Pub =
        deviceTSSIndex === 2 ? tssCommitA0.add(tssCommitA1).add(tssCommitA1) : tssCommitA0.add(tssCommitA1).add(tssCommitA1).add(tssCommitA1);
      strictEqual(tss2Pub.x.toString(16, 64), _tss2Pub.x.toString(16, 64));
      strictEqual(tss2Pub.y.toString(16, 64), _tss2Pub.y.toString(16, 64));
    });
    it("#should be able to reconstruct tss key from factor key (tss2) when initializing a key with useTSS true", async function () {
      const sp = customSP;

      if (!sp.useTSS) this.skip();

      sp.verifierName = "torus-test-health";
      // expect new account, use new random verifierId
      sp.verifierId = generateVerifierId();

      const { serverDKGPrivKeys } = await setupTSS({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 2,
        tssTag: "default",
        MOCK_RSS,
      });

      const tss1 = new BN(serverDKGPrivKeys[0], "hex");
      const deviceTSSShare = new BN(generatePrivate());
      const deviceTSSIndex = 2;

      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

      // factor key needs to passed from outside of tKey
      const factorKey = new BN(generatePrivate());
      const factorPub = getPubKeyPoint(factorKey);

      await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const { tssShare: tss2 } = await tb1.getTSSShare(factorKey);
      const tssCommits = tb1.getTSSCommits();

      const tssPrivKey = getLagrangeCoeffs([1, deviceTSSIndex], 1)
        .mul(tss1)
        .add(getLagrangeCoeffs([1, deviceTSSIndex], deviceTSSIndex).mul(tss2))
        .umod(ecCurve.n);

      const tssPubKey = getPubKeyPoint(tssPrivKey);
      strictEqual(tssPubKey.x.toString(16, 64), tssCommits[0].x.toString(16, 64));
      strictEqual(tssPubKey.y.toString(16, 64), tssCommits[0].y.toString(16, 64));
    });
    it("#should be able to serialize and deserialize with tss even with rss", async function () {
      const sp = customSP;
      if (!sp.useTSS) this.skip();

      const deviceTSSShare = new BN(generatePrivate());
      const deviceTSSIndex = 3;

      sp.verifierName = "torus-test-health";
      // expect new account, use new random verifierId
      sp.verifierId = generateVerifierId();

      const { signatures, serverDKGPrivKeys } = await setupTSS({
        serviceProvider: sp,
        verifierName: sp.verifierName,
        verifierId: sp.verifierId,
        maxTSSNonceToSimulate: 2,
        tssTag: "default",
        MOCK_RSS,
      });

      const testId = sp.getVerifierNameVerifierId();

      const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

      // factor key needs to passed from outside of tKey
      const factorKey = new BN(generatePrivate());
      const factorPub = getPubKeyPoint(factorKey);

      await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
      const reconstructedKey = await tb1.reconstructKey();
      await tb1.syncLocalMetadataTransitions();
      if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb1.getTSSShare(factorKey);
      const tssCommits = tb1.getTSSCommits();

      const tssPrivKey = getLagrangeCoeffs([1, retrievedTSSIndex], 1)
        .mul(serverDKGPrivKeys[0])
        .add(getLagrangeCoeffs([1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
        .umod(ecCurve.n);

      const tssPubKey = getPubKeyPoint(tssPrivKey);
      strictEqual(tssPubKey.x.toString(16, 64), tssCommits[0].x.toString(16, 64));
      strictEqual(tssPubKey.y.toString(16, 64), tssCommits[0].y.toString(16, 64));

      // test tss refresh

      const factorKey2 = new BN(generatePrivate());
      const factorPub2 = getPubKeyPoint(factorKey2);

      const factorPubs = [factorPub, factorPub2];
      const { serverEndpoints, serverPubKeys } = await sp.getRSSNodeDetails();

      await tb1._refreshTSSShares(true, retrievedTSS, retrievedTSSIndex, factorPubs, [2, 3], testId, {
        serverThreshold: 3,
        selectedServers: [1, 2, 3],
        serverEndpoints,
        serverPubKeys,
      });

      {
        const { tssShare: newTSS2 } = await tb1.getTSSShare(factorKey);
        const newTSSPrivKey = getLagrangeCoeffs([1, 2], 1)
          .mul(new BN(serverDKGPrivKeys[1], "hex"))
          .add(getLagrangeCoeffs([1, 2], 2).mul(newTSS2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
      }

      {
        const { tssShare: newTSS2 } = await tb1.getTSSShare(factorKey2);
        const newTSSPrivKey = getLagrangeCoeffs([1, 3], 1)
          .mul(new BN(serverDKGPrivKeys[1], "hex"))
          .add(getLagrangeCoeffs([1, 3], 3).mul(newTSS2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
      }

      const serialized = stringify(tb1);

      const deserialized = await ThresholdKey.fromJSON(JSON.parse(serialized), { serviceProvider: sp, storageLayer, manualSync: mode });
      const serialized2 = stringify(deserialized);

      strictEqual(serialized, serialized2);

      const tb2 = await ThresholdKey.fromJSON(JSON.parse(serialized2), { serviceProvider: sp, storageLayer, manualSync: mode });
      {
        const { tssShare: newTSS2 } = await tb2.getTSSShare(factorKey);
        const newTSSPrivKey = getLagrangeCoeffs([1, 2], 1)
          .mul(new BN(serverDKGPrivKeys[1], "hex"))
          .add(getLagrangeCoeffs([1, 2], 2).mul(newTSS2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
      }

      {
        const { tssShare: newTSS2 } = await tb2.getTSSShare(factorKey2);
        const newTSSPrivKey = getLagrangeCoeffs([1, 3], 1)
          .mul(new BN(serverDKGPrivKeys[1], "hex"))
          .add(getLagrangeCoeffs([1, 3], 3).mul(newTSS2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
      }
    });
    describe("with tss, tkey share deletion", function () {
      let deletedShareIndex;
      let shareStoreAfterDelete;
      let tb;
      let tbTssInitResp;
      let oldFactorKey;
      let newFactorKey;
      before(`#should be able to generate and delete a share, manualSync=${mode}`, async function () {
        const sp = customSP;

        if (!sp.useTSS) this.skip();
        const deviceTSSShare = new BN(generatePrivate());
        const deviceTSSIndex = 3;

        sp.verifierName = verifierId;
        sp.verifierId = "test192@example.com";
        const { signatures, serverDKGPrivKeys } = await setupTSS({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 4,
          tssTag: "default",
          MOCK_RSS,
        });

        // tb = new ThresholdKey({ serviceProvider: sp, storageLayer: customSL, manualSync: mode });
        // tbInitResp = await tb._initializeNewKey({ initializeModules: true });
        // oldFactorKey = new BN(generatePrivate());
        // const oldFactorPub = getPubKeyPoint(oldFactorKey);
        // tbTssInitResp = await tb._initializeNewTSSKey("default", deviceTSSShare, oldFactorPub, deviceTSSIndex);
        // const { factorEncs, factorPubs, tssPolyCommits } = tbTssInitResp;
        // tb.metadata.addTSSData({ tssTag: tb.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
        // // const { factorEncs, factorPubs, tssPolyCommits } = tbTssInitResp;

        tb = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

        // factor key needs to passed from outside of tKey
        const factorKey = new BN(generatePrivate());
        const factorPub = getPubKeyPoint(factorKey);
        await tb.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
        newFactorKey = new BN(generatePrivate());

        const newFactorPub = getPubKeyPoint(newFactorKey);
        const newShare = await tb.generateNewShare(true, {
          inputTSSShare: deviceTSSShare,
          inputTSSIndex: deviceTSSIndex,
          newFactorPub,
          newTSSIndex: 2,
          authSignatures: signatures,
        });
        const reconstructedKey = await tb.reconstructKey();
        await tb.syncLocalMetadataTransitions();

        if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
          fail("key should be able to be reconstructed");
        }
        const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb.getTSSShare(factorKey);
        const tssCommits = tb.getTSSCommits();
        const tssPrivKey = getLagrangeCoeffs([1, retrievedTSSIndex], 1)
          .mul(serverDKGPrivKeys[1])
          .add(getLagrangeCoeffs([1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
          .umod(ecCurve.n);
        const tssPubKey = getPubKeyPoint(tssPrivKey);

        strictEqual(tssPubKey.x.toString(16, 64), tssCommits[0].x.toString(16, 64));
        strictEqual(tssPubKey.y.toString(16, 64), tssCommits[0].y.toString(16, 64));
        const updatedShareStore = await tb.deleteShare(newShare.newShareIndex, true, {
          inputTSSIndex: retrievedTSSIndex,
          inputTSSShare: retrievedTSS,
          authSignatures: signatures,
          factorPub,
        });

        deletedShareIndex = newShare.newShareIndex;
        shareStoreAfterDelete = updatedShareStore.newShareStores;

        await tb.syncLocalMetadataTransitions();
      });
      it(`#should be not be able to lookup delete share, manualSync=${mode}`, async function () {
        if (!customSP.useTSS) this.skip();
        const newKeys = Object.keys(shareStoreAfterDelete);
        if (newKeys.find((el) => el === deletedShareIndex.toString("hex"))) {
          fail("Unable to delete share index");
        }
        rejects(async () => {
          await tb.getTSSShare(oldFactorKey);
        });
        await tb.getTSSShare(newFactorKey);
      });
      // it(`#should be able to delete a user and reset tss nonce, manualSync=${mode}`, async function () {
      //   if (!customSP.useTSS) this.skip();
      //   // create 2/4
      //   await tb._initializeNewKey({ initializeModules: true });
      //   await tb.generateNewShare();
      //   const shareStoresAtEpoch2 = tb.getAllShareStoresForLatestPolynomial();

      //   await tb.generateNewShare();
      //   await tb.syncLocalMetadataTransitions();
      //   const sharesStoresAtEpoch3 = tb.getAllShareStoresForLatestPolynomial();
      //   await tb.CRITICAL_deleteTkey();

      //   const spData = await customSL.getMetadata({ serviceProvider: customSP });
      //   const data2 = await Promise.allSettled(shareStoresAtEpoch2.map((x) => tb.catchupToLatestShare({ shareStore: x })));
      //   const data3 = await Promise.all(sharesStoresAtEpoch3.map((x) => customSL.getMetadata({ privKey: x.share.share })));

      //   deepStrictEqual(spData.message, KEY_NOT_FOUND);

      //   data2.forEach((x) => {
      //     deepStrictEqual(x.status, "rejected");
      //     deepStrictEqual(x.reason.code, 1308);
      //   });

      //   data3.forEach((x) => {
      //     deepStrictEqual(x.message, SHARE_DELETED);
      //   });

      //   // TODO: check that TSS nonce is reset
      // });
      it(`#should be able to reinitialize after wipe, manualSync=${mode}`, async function () {
        if (!customSP.useTSS) this.skip();
        // create 2/4
        const resp1 = await tb._initializeNewKey({ initializeModules: true });
        await tb.generateNewShare();
        if (mode) {
          await tb.syncLocalMetadataTransitions();
        }
        await tb.CRITICAL_deleteTkey();

        const tb2 = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync: mode });
        await tb2.initialize();
        await tb2.generateNewShare();
        if (mode) {
          await tb2.syncLocalMetadataTransitions();
        }

        const data3 = await customSL.getMetadata({ serviceProvider: customSP });
        notEqual(data3.message, KEY_NOT_FOUND);
        deepStrictEqual(tb2.metadata.nonce, 1);

        const reconstructedKey = await tb2.reconstructKey();
        if (resp1.privKey.cmp(reconstructedKey.privKey) === 0) {
          fail("key should be different");
        }
        // TODO: check that TSS is reset and still able to use TSS methods
      });
    });
    describe("with tss, tkey serialization/deserialization", function () {
      let tb;
      beforeEach("Setup ThresholdKey", async function () {
        if (!customSP.useTSS) this.skip();
        tb = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync: mode });
      });
      it(`#should serialize and deserialize correctly without tkeyArgs, manualSync=${mode}`, async function () {
        if (!customSP.useTSS) this.skip();
        const sp = customSP;
        let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
        userInput = userInput.umod(ecCurve.curve.n);
        const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

        sp.verifierName = "torus-test-health";
        sp.verifierId = verifierId;
        const { signatures, serverDKGPrivKeys } = await setupTSS({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 2,
          tssTag: "default",
          MOCK_RSS,
        });

        const deviceTSSShare = new BN(generatePrivate());
        const deviceTSSIndex = 2;
        const factorKey = new BN(generatePrivate());
        const factorPub = getPubKeyPoint(factorKey);
        const { factorEncs, factorPubs, tssPolyCommits } = await tb._initializeNewTSSKey("default", deviceTSSShare, factorPub, deviceTSSIndex);
        tb.metadata.addTSSData({ tssTag: tb.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
        const { tssShare, tssIndex } = await tb.getTSSShare(factorKey);

        const tssPrivKey = getLagrangeCoeffs([1, tssIndex], 1)
          .mul(serverDKGPrivKeys[0])
          .add(getLagrangeCoeffs([1, tssIndex], tssIndex).mul(tssShare))
          .umod(ecCurve.n);

        const newFactorKey = new BN(generatePrivate());
        const newFactorPub = getPubKeyPoint(newFactorKey);

        await tb.generateNewShare(true, {
          inputTSSShare: tssShare,
          inputTSSIndex: tssIndex,
          newFactorPub,
          newTSSIndex: 3,
        });
        await tb.syncLocalMetadataTransitions();

        const stringified = JSON.stringify(tb);
        const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified));
        const finalKey = await tb3.reconstructKey();
        strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

        const { tssShare: tssShare2, tssIndex: tssIndex2 } = await tb3.getTSSShare(newFactorKey);
        const tssPrivKey2 = getLagrangeCoeffs([1, tssIndex2], 1)
          .mul(serverDKGPrivKeys[1])
          .add(getLagrangeCoeffs([1, tssIndex2], tssIndex2).mul(tssShare2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString("hex"), tssPrivKey2.toString("hex"), "Incorrect tss key");
      });
      it(`#should serialize and deserialize correctly with tkeyArgs, manualSync=${mode}`, async function () {
        if (!customSP.useTSS) this.skip();
        let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
        userInput = userInput.umod(ecCurve.curve.n);
        const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

        const sp = customSP;
        sp.verifierName = "torus-test-health";
        sp.verifierId = "test18@example.com";
        const { signatures, serverDKGPrivKeys } = await setupTSS({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 2,
          tssTag: "default",
          MOCK_RSS,
        });

        const deviceTSSShare = new BN(generatePrivate());
        const deviceTSSIndex = 2;
        const factorKey = new BN(generatePrivate());
        const factorPub = getPubKeyPoint(factorKey);
        const { factorEncs, factorPubs, tssPolyCommits } = await tb._initializeNewTSSKey("default", deviceTSSShare, factorPub, deviceTSSIndex);
        tb.metadata.addTSSData({ tssTag: tb.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
        const { tssShare, tssIndex } = await tb.getTSSShare(factorKey);
        const tssPrivKey = getLagrangeCoeffs([1, tssIndex], 1)
          .mul(serverDKGPrivKeys[0])
          .add(getLagrangeCoeffs([1, tssIndex], tssIndex).mul(tssShare))
          .umod(ecCurve.n);

        const newFactorKey = new BN(generatePrivate());
        const newFactorPub = getPubKeyPoint(newFactorKey);

        await tb.generateNewShare(true, {
          inputTSSShare: tssShare,
          inputTSSIndex: tssIndex,
          newFactorPub,
          newTSSIndex: 3,
        });

        await tb.syncLocalMetadataTransitions();

        const stringified = JSON.stringify(tb);
        const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: customSP, storageLayer: customSL });
        const finalKey = await tb3.reconstructKey();
        strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

        const { tssShare: tssShare2, tssIndex: tssIndex2 } = await tb3.getTSSShare(newFactorKey);
        const tssPrivKey2 = getLagrangeCoeffs([1, tssIndex2], 1)
          .mul(serverDKGPrivKeys[1])
          .add(getLagrangeCoeffs([1, tssIndex2], tssIndex2).mul(tssShare2))
          .umod(ecCurve.n);
        strictEqual(tssPrivKey.toString("hex"), tssPrivKey2.toString("hex"), "Incorrect tss key");
      });
      // TODO: add test for initialize such that initialize throws if the remote metadata is already there
      it(`#should serialize and deserialize correctly, keeping localTransitions consistent before syncing NewKeyAssign, manualSync=${mode}`, async function () {
        if (!customSP.useTSS) this.skip();

        const sp = customSP;
        sp.verifierName = "torus-test-health";
        sp.verifierId = verifierId;
        const { signatures, serverDKGPrivKeys } = await setupTSS({
          serviceProvider: sp,
          verifierName: sp.verifierName,
          verifierId: sp.verifierId,
          maxTSSNonceToSimulate: 2,
          tssTag: "default",
          MOCK_RSS,
        });

        let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
        userInput = userInput.umod(ecCurve.curve.n);
        const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

        // generate and delete
        const { newShareIndex: shareIndex1 } = await tb.generateNewShare();
        await tb.deleteShare(shareIndex1);

        const { newShareStores: shareStores, newShareIndex: shareIndex } = await tb.generateNewShare();

        const stringified = JSON.stringify(tb);
        const tb2 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: sp, storageLayer: customSL });
        if (tb2.manualSync !== mode) {
          fail(`manualSync should be ${mode}`);
        }
        const finalKey = await tb2.reconstructKey();
        const shareToVerify = tb2.outputShareStore(shareIndex);
        // TODO: tb2.generateNewShare()
        strictEqual(shareStores[shareIndex.toString("hex")].share.share.toString("hex"), shareToVerify.share.share.toString("hex"));
        await tb2.syncLocalMetadataTransitions();
        strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

        const reconstructedKey2 = await tb2.reconstructKey();
        if (resp1.privKey.cmp(reconstructedKey2.privKey) !== 0) {
          fail("key should be able to be reconstructed");
        }
      });
      it(`#should serialize and deserialize correctly keeping localTransitions afterNewKeyAssign, manualSync=${mode}`, async function () {
        if (!customSP.useTSS) this.skip();
        let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
        userInput = userInput.umod(ecCurve.curve.n);
        const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });
        // TODO: tss initialize
        await tb.syncLocalMetadataTransitions();
        const reconstructedKey = await tb.reconstructKey();
        // TODO: reconstruct tss key
        const { newShareStores: shareStores, newShareIndex: shareIndex } = await tb.generateNewShare();

        const stringified = JSON.stringify(tb);
        const tb2 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: customSP, storageLayer: customSL });
        const finalKey = await tb2.reconstructKey();
        // TODO: reconstruct tss key
        const shareToVerify = tb2.outputShareStore(shareIndex);
        strictEqual(shareStores[shareIndex.toString("hex")].share.share.toString("hex"), shareToVerify.share.share.toString("hex"));
        await tb2.syncLocalMetadataTransitions();
        strictEqual(finalKey.privKey.toString("hex"), reconstructedKey.privKey.toString("hex"), "Incorrect serialization");
        // TODO: both tss keys should be the same

        const reconstructedKey2 = await tb2.reconstructKey();
        if (resp1.privKey.cmp(reconstructedKey2.privKey) !== 0) {
          fail("key should be able to be reconstructed");
        }
      });
      it(`#should not be able to updateSDK with newKeyAssign transitions unsynced, manualSync=${mode}`, async function () {
        await tb._initializeNewKey({ initializeModules: true });
        // TODO: initialize new tss key
        const stringified = JSON.stringify(tb);
        const tb2 = await ThresholdKey.fromJSON(JSON.parse(stringified), {});

        if (mode) {
          // Can't updateSDK, please do key assign.
          await rejects(async function () {
            await tb2.updateSDK(); // TODO: does this need params? update function to handle TSS in tb.initialize core.ts:1130
          }, Error);
        }
        // create new key because the state might have changed after updateSDK()
        const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), {});
        await tb3.generateNewShare();
        await tb3.syncLocalMetadataTransitions();
        await tb3.updateSDK();
      });
    });
  });
};
