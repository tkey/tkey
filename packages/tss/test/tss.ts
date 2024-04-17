import { KeyType, keyTypeToCurve, Point } from "@tkey/common-types";
import { equal, fail } from "assert";
import BN from "bn.js";

import { FACTOR_KEY_TYPE, TKeyTSS as ThresholdKey, TSSTorusServiceProvider } from "../src";
import { BasePoint, getLagrangeCoeffs, pointToElliptic } from "../src/util";
import { assignTssDkgKeys, fetchPostboxKeyAndSigs, initStorageLayer } from "./helpers";

const TKEY_KEY_TYPE = KeyType.secp256k1; // TODO iterate over secp256k1 and ed25519
const TSS_KEY_TYPE = KeyType.secp256k1; // TODO iterate over secp256k1 and ed25519

const ecFactor = keyTypeToCurve(FACTOR_KEY_TYPE);
const ecTSS = keyTypeToCurve(TSS_KEY_TYPE);

const torusSP = new TSSTorusServiceProvider({
  customAuthArgs: {
    network: "sapphire_devnet",
    web3AuthClientId: "YOUR_CLIENT_ID",
    baseUrl: "http://localhost:3000",
  },
  tssKeyType: TSS_KEY_TYPE,
});

const torusSL = initStorageLayer();

const manualSync = true;

describe("TSS tests", function () {
  it("#should be able to reconstruct tssShare from factor key", async function () {
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
      keyType: TKEY_KEY_TYPE,
      tssKeyType: TSS_KEY_TYPE,
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
    const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync, keyType: TKEY_KEY_TYPE, tssKeyType: TSS_KEY_TYPE });

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
    equal(tssPubKey.eq(tssCommits0), true);
  });

  it(`#should be able to import a tss key, manualSync=${manualSync}`, async function () {
    const sp = torusSP;

    const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
    const deviceTSSIndex = 2;
    const newTSSIndex = 3;

    sp.verifierName = "torus-test-health";
    sp.verifierId = "importeduser@example.com";
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

    const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: TKEY_KEY_TYPE, tssKeyType: TSS_KEY_TYPE });

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
    const importedKey = ecTSS.genKeyPair().getPrivate();
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
    equal(tssPrivKey1.toString("hex"), importedKey.toString("hex"));

    const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: TKEY_KEY_TYPE, tssKeyType: TSS_KEY_TYPE });

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
    equal(tssPrivKeyImported.toString("hex"), importedKey.toString("hex"));
  });

  it(`#should be able to unsafe export final tss key, manualSync=${manualSync}`, async function () {
    const sp = torusSP;

    const deviceTSSShare = ecTSS.genKeyPair().getPrivate();
    const deviceTSSIndex = 3;

    sp.verifierName = "torus-test-health";
    sp.verifierId = "exportUser@example.com";
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

    const tb = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: TKEY_KEY_TYPE, tssKeyType: TSS_KEY_TYPE });

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
    const importedKey = ecTSS.genKeyPair().getPrivate();
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
      const tssPubKeyImported = (ecTSS.g as BasePoint).mul(importedKey);

      equal(finalTssKey.toString("hex"), importedKey.toString("hex"));
      equal(tssPubKeyImported.eq(finalPubKey), true);
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

    const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: torusSL, manualSync, keyType: TKEY_KEY_TYPE, tssKeyType: TSS_KEY_TYPE });

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

      equal(finalTssKey.toString("hex"), importedKey.toString("hex"));
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

  // it("#should be able to serialize and deserialize with tss even with rss", async function () {
  //   const sp = customSP;
  //   if (!sp.useTSS) this.skip();

  //   const deviceTSSShare = new BN(generatePrivate());
  //   const deviceTSSIndex = 3;

  //   sp.verifierName = "torus-test-health";
  //   sp.verifierId = "test18@example.com";
  //   const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
  //     serviceProvider: sp,
  //     verifierName: sp.verifierName,
  //     verifierId: sp.verifierId,
  //   });

  //   const testId = sp.getVerifierNameVerifierId();

  //   sp.postboxKey = postboxkey;
  //   const { serverDKGPrivKeys } = await assignTssDkgKeys({
  //     serviceProvider: sp,
  //     verifierName: sp.verifierName,
  //     verifierId: sp.verifierId,
  //     maxTSSNonceToSimulate: 2,
  //   });
  //   const storageLayer = initStorageLayer({ hostUrl: metadataURL });
  //   const tb1 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

  //   // factor key needs to passed from outside of tKey
  //   const factorKey = new BN(generatePrivate());
  //   const factorPub = getPubKeyPoint(factorKey);

  //   await tb1.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
  //   const reconstructedKey = await tb1.reconstructKey();
  //   await tb1.syncLocalMetadataTransitions();
  //   if (tb1.privKey.cmp(reconstructedKey.privKey) !== 0) {
  //     fail("key should be able to be reconstructed");
  //   }

  //   const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb1.getTSSShare(factorKey);
  //   const tssCommits = tb1.getTSSCommits();

  //   const tssPrivKey = getLagrangeCoeffs([1, retrievedTSSIndex], 1)
  //     .mul(serverDKGPrivKeys[0])
  //     .add(getLagrangeCoeffs([1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
  //     .umod(ecCurve.n);

  //   const tssPubKey = getPubKeyPoint(tssPrivKey);
  //   strictEqual(tssPubKey.x.toString(16, 64), tssCommits[0].x.toString(16, 64));
  //   strictEqual(tssPubKey.y.toString(16, 64), tssCommits[0].y.toString(16, 64));

  //   // test tss refresh

  //   const factorKey2 = new BN(generatePrivate());
  //   const factorPub2 = getPubKeyPoint(factorKey2);

  //   const factorPubs = [factorPub, factorPub2];
  //   const { serverEndpoints, serverPubKeys } = await sp.getRSSNodeDetails();

  //   await tb1._refreshTSSShares(true, retrievedTSS, retrievedTSSIndex, factorPubs, [2, 3], testId, {
  //     serverThreshold: 3,
  //     selectedServers: [1, 2, 3],
  //     serverEndpoints,
  //     serverPubKeys,
  //     authSignatures: signatures,
  //   });

  //   {
  //     const { tssShare: newTSS2 } = await tb1.getTSSShare(factorKey);
  //     const newTSSPrivKey = getLagrangeCoeffs([1, 2], 1)
  //       .mul(new BN(serverDKGPrivKeys[1], "hex"))
  //       .add(getLagrangeCoeffs([1, 2], 2).mul(newTSS2))
  //       .umod(ecCurve.n);
  //     strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
  //   }

  //   {
  //     const { tssShare: newTSS2 } = await tb1.getTSSShare(factorKey2);
  //     const newTSSPrivKey = getLagrangeCoeffs([1, 3], 1)
  //       .mul(new BN(serverDKGPrivKeys[1], "hex"))
  //       .add(getLagrangeCoeffs([1, 3], 3).mul(newTSS2))
  //       .umod(ecCurve.n);
  //     strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
  //   }

  //   const serialized = stringify(tb1);

  //   const deserialized = await ThresholdKey.fromJSON(JSON.parse(serialized), { serviceProvider: sp, storageLayer, manualSync: mode });
  //   const serialized2 = stringify(deserialized);

  //   strictEqual(serialized, serialized2);

  //   const tb2 = await ThresholdKey.fromJSON(JSON.parse(serialized2), { serviceProvider: sp, storageLayer, manualSync: mode });
  //   {
  //     const { tssShare: newTSS2 } = await tb2.getTSSShare(factorKey);
  //     const newTSSPrivKey = getLagrangeCoeffs([1, 2], 1)
  //       .mul(new BN(serverDKGPrivKeys[1], "hex"))
  //       .add(getLagrangeCoeffs([1, 2], 2).mul(newTSS2))
  //       .umod(ecCurve.n);
  //     strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
  //   }

  //   {
  //     const { tssShare: newTSS2 } = await tb2.getTSSShare(factorKey2);
  //     const newTSSPrivKey = getLagrangeCoeffs([1, 3], 1)
  //       .mul(new BN(serverDKGPrivKeys[1], "hex"))
  //       .add(getLagrangeCoeffs([1, 3], 3).mul(newTSS2))
  //       .umod(ecCurve.n);
  //     strictEqual(tssPrivKey.toString(16, 64), newTSSPrivKey.toString(16, 64));
  //   }
  // });

  // describe("with tss, tkey share deletion", function () {
  //   let deletedShareIndex;
  //   let shareStoreAfterDelete;
  //   let tb;
  //   let tbTssInitResp;
  //   let oldFactorKey;
  //   let newFactorKey;

  //   before(`#should be able to generate and delete a share, manualSync=${mode}`, async function () {
  //     const sp = customSP;

  //     if (!sp.useTSS) this.skip();
  //     const deviceTSSShare = new BN(generatePrivate());
  //     const deviceTSSIndex = 3;

  //     sp.verifierName = "torus-test-health";
  //     sp.verifierId = "test192@example.com";
  //     const { signatures, postboxkey } = await fetchPostboxKeyAndSigs({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //     });
  //     sp.postboxKey = postboxkey;
  //     const { serverDKGPrivKeys } = await assignTssDkgKeys({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //       maxTSSNonceToSimulate: 4,
  //     });

  //     // tb = new ThresholdKey({ serviceProvider: sp, storageLayer: customSL, manualSync: mode });
  //     // tbInitResp = await tb._initializeNewKey({ initializeModules: true });
  //     // oldFactorKey = new BN(generatePrivate());
  //     // const oldFactorPub = getPubKeyPoint(oldFactorKey);
  //     // tbTssInitResp = await tb._initializeNewTSSKey("default", deviceTSSShare, oldFactorPub, deviceTSSIndex);
  //     // const { factorEncs, factorPubs, tssPolyCommits } = tbTssInitResp;
  //     // tb.metadata.addTSSData({ tssTag: tb.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
  //     // // const { factorEncs, factorPubs, tssPolyCommits } = tbTssInitResp;

  //     tb = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });

  //     // factor key needs to passed from outside of tKey
  //     const factorKey = new BN(generatePrivate());
  //     const factorPub = getPubKeyPoint(factorKey);
  //     await tb.initialize({ useTSS: true, factorPub, deviceTSSShare, deviceTSSIndex });
  //     newFactorKey = new BN(generatePrivate());

  //     const newFactorPub = getPubKeyPoint(newFactorKey);
  //     const newShare = await tb.generateNewShare(true, {
  //       inputTSSShare: deviceTSSShare,
  //       inputTSSIndex: deviceTSSIndex,
  //       newFactorPub,
  //       newTSSIndex: 2,
  //       authSignatures: signatures,
  //     });
  //     const reconstructedKey = await tb.reconstructKey();
  //     await tb.syncLocalMetadataTransitions();

  //     if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
  //       fail("key should be able to be reconstructed");
  //     }
  //     const { tssShare: retrievedTSS, tssIndex: retrievedTSSIndex } = await tb.getTSSShare(factorKey);
  //     const tssCommits = tb.getTSSCommits();
  //     const tssPrivKey = getLagrangeCoeffs([1, retrievedTSSIndex], 1)
  //       .mul(serverDKGPrivKeys[1])
  //       .add(getLagrangeCoeffs([1, retrievedTSSIndex], retrievedTSSIndex).mul(retrievedTSS))
  //       .umod(ecCurve.n);
  //     const tssPubKey = getPubKeyPoint(tssPrivKey);

  //     strictEqual(tssPubKey.x.toString(16, 64), tssCommits[0].x.toString(16, 64));
  //     strictEqual(tssPubKey.y.toString(16, 64), tssCommits[0].y.toString(16, 64));
  //     const updatedShareStore = await tb.deleteShare(newShare.newShareIndex, true, {
  //       inputTSSIndex: retrievedTSSIndex,
  //       inputTSSShare: retrievedTSS,
  //       authSignatures: signatures,
  //       factorPub,
  //     });

  //     deletedShareIndex = newShare.newShareIndex;
  //     shareStoreAfterDelete = updatedShareStore.newShareStores;

  //     await tb.syncLocalMetadataTransitions();
  //   });

  //   it(`#should be not be able to lookup delete share, manualSync=${mode}`, async function () {
  //     if (!customSP.useTSS) this.skip();
  //     const newKeys = Object.keys(shareStoreAfterDelete);
  //     if (newKeys.find((el) => el === deletedShareIndex.toString("hex"))) {
  //       fail("Unable to delete share index");
  //     }
  //     rejects(async () => {
  //       await tb.getTSSShare(oldFactorKey);
  //     });
  //     await tb.getTSSShare(newFactorKey);
  //   });

  //   it(`#should be able to reinitialize after wipe, manualSync=${mode}`, async function () {
  //     if (!customSP.useTSS) this.skip();
  //     // create 2/4
  //     const resp1 = await tb._initializeNewKey({ initializeModules: true });
  //     await tb.generateNewShare();
  //     if (mode) {
  //       await tb.syncLocalMetadataTransitions();
  //     }
  //     await tb.CRITICAL_deleteTkey();

  //     const tb2 = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync: mode });
  //     await tb2.initialize();
  //     await tb2.generateNewShare();
  //     if (mode) {
  //       await tb2.syncLocalMetadataTransitions();
  //     }

  //     const data3 = await customSL.getMetadata({ serviceProvider: customSP });
  //     notEqual(data3.message, KEY_NOT_FOUND);
  //     deepStrictEqual(tb2.metadata.nonce, 1);

  //     const reconstructedKey = await tb2.reconstructKey();
  //     if (resp1.privKey.cmp(reconstructedKey.privKey) === 0) {
  //       fail("key should be different");
  //     }
  //     // TODO: check that TSS is reset and still able to use TSS methods
  //   });
  // });

  // describe("with tss, tkey serialization/deserialization", function () {
  //   let tb;

  //   beforeEach("Setup ThresholdKey", async function () {
  //     if (!customSP.useTSS) this.skip();
  //     tb = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync: mode });
  //   });

  //   it(`#should serialize and deserialize correctly without tkeyArgs, manualSync=${mode}`, async function () {
  //     if (!customSP.useTSS) this.skip();
  //     const sp = customSP;
  //     let userInput = new BN(keccak256(Buffer.from("user answer blublu", "utf-8")).slice(2), "hex");
  //     userInput = userInput.umod(ecCurve.curve.n);
  //     const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

  //     sp.verifierName = "torus-test-health";
  //     sp.verifierId = "test18@example.com";
  //     const { postboxkey, signatures } = await fetchPostboxKeyAndSigs({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //     });
  //     sp.postboxKey = postboxkey;
  //     const { serverDKGPrivKeys } = await assignTssDkgKeys({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //       maxTSSNonceToSimulate: 2,
  //     });
  //     const deviceTSSShare = new BN(generatePrivate());
  //     const deviceTSSIndex = 2;
  //     const factorKey = new BN(generatePrivate());
  //     const factorPub = getPubKeyPoint(factorKey);
  //     const { factorEncs, factorPubs, tssPolyCommits } = await tb._initializeNewTSSKey("default", deviceTSSShare, factorPub, deviceTSSIndex);
  //     tb.metadata.addTSSData({ tssTag: tb.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
  //     const { tssShare, tssIndex } = await tb.getTSSShare(factorKey);

  //     const tssPrivKey = getLagrangeCoeffs([1, tssIndex], 1)
  //       .mul(serverDKGPrivKeys[0])
  //       .add(getLagrangeCoeffs([1, tssIndex], tssIndex).mul(tssShare))
  //       .umod(ecCurve.n);

  //     const newFactorKey = new BN(generatePrivate());
  //     const newFactorPub = getPubKeyPoint(newFactorKey);

  //     await tb.generateNewShare(true, {
  //       inputTSSShare: tssShare,
  //       inputTSSIndex: tssIndex,
  //       newFactorPub,
  //       newTSSIndex: 3,
  //       authSignatures: signatures,
  //     });
  //     await tb.syncLocalMetadataTransitions();

  //     const stringified = JSON.stringify(tb);
  //     const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified));
  //     const finalKey = await tb3.reconstructKey();
  //     strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

  //     const { tssShare: tssShare2, tssIndex: tssIndex2 } = await tb3.getTSSShare(newFactorKey);
  //     const tssPrivKey2 = getLagrangeCoeffs([1, tssIndex2], 1)
  //       .mul(serverDKGPrivKeys[1])
  //       .add(getLagrangeCoeffs([1, tssIndex2], tssIndex2).mul(tssShare2))
  //       .umod(ecCurve.n);
  //     strictEqual(tssPrivKey.toString("hex"), tssPrivKey2.toString("hex"), "Incorrect tss key");
  //   });

  //   it(`#should serialize and deserialize correctly with tkeyArgs, manualSync=${mode}`, async function () {
  //     if (!customSP.useTSS) this.skip();
  //     let userInput = new BN(keccak256(Buffer.from("user answer blublu", "utf-8")).slice(2), "hex");
  //     userInput = userInput.umod(ecCurve.curve.n);
  //     const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

  //     const sp = customSP;
  //     sp.verifierName = "torus-test-health";
  //     sp.verifierId = "test18@example.com";
  //     const { postboxkey, signatures } = await fetchPostboxKeyAndSigs({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //     });
  //     sp.postboxKey = postboxkey;
  //     const { serverDKGPrivKeys } = await assignTssDkgKeys({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //       maxTSSNonceToSimulate: 2,
  //     });
  //     const deviceTSSShare = new BN(generatePrivate());
  //     const deviceTSSIndex = 2;
  //     const factorKey = new BN(generatePrivate());
  //     const factorPub = getPubKeyPoint(factorKey);
  //     const { factorEncs, factorPubs, tssPolyCommits } = await tb._initializeNewTSSKey("default", deviceTSSShare, factorPub, deviceTSSIndex);
  //     tb.metadata.addTSSData({ tssTag: tb.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
  //     const { tssShare, tssIndex } = await tb.getTSSShare(factorKey);
  //     const tssPrivKey = getLagrangeCoeffs([1, tssIndex], 1)
  //       .mul(serverDKGPrivKeys[0])
  //       .add(getLagrangeCoeffs([1, tssIndex], tssIndex).mul(tssShare))
  //       .umod(ecCurve.n);

  //     const newFactorKey = new BN(generatePrivate());
  //     const newFactorPub = getPubKeyPoint(newFactorKey);

  //     await tb.generateNewShare(true, {
  //       inputTSSShare: tssShare,
  //       inputTSSIndex: tssIndex,
  //       newFactorPub,
  //       newTSSIndex: 3,
  //       authSignatures: signatures,
  //     });

  //     await tb.syncLocalMetadataTransitions();

  //     const stringified = JSON.stringify(tb);
  //     const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: customSP, storageLayer: customSL });
  //     const finalKey = await tb3.reconstructKey();
  //     strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

  //     const { tssShare: tssShare2, tssIndex: tssIndex2 } = await tb3.getTSSShare(newFactorKey);
  //     const tssPrivKey2 = getLagrangeCoeffs([1, tssIndex2], 1)
  //       .mul(serverDKGPrivKeys[1])
  //       .add(getLagrangeCoeffs([1, tssIndex2], tssIndex2).mul(tssShare2))
  //       .umod(ecCurve.n);
  //     strictEqual(tssPrivKey.toString("hex"), tssPrivKey2.toString("hex"), "Incorrect tss key");
  //   });
  //   // TODO: add test for initialize such that initialize throws if the remote metadata is already there
  //   it(`#should serialize and deserialize correctly, keeping localTransitions consistent before syncing NewKeyAssign, manualSync=${mode}`, async function () {
  //     if (!customSP.useTSS) this.skip();

  //     const sp = customSP;
  //     sp.verifierName = "torus-test-health";
  //     sp.verifierId = "test18@example.com";
  //     const { postboxkey } = await fetchPostboxKeyAndSigs({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //     });
  //     sp.postboxKey = postboxkey;
  //     await assignTssDkgKeys({
  //       serviceProvider: sp,
  //       verifierName: sp.verifierName,
  //       verifierId: sp.verifierId,
  //       maxTSSNonceToSimulate: 2,
  //     });

  //     let userInput = new BN(keccak256(Buffer.from("user answer blublu", "utf-8")).slice(2), "hex");
  //     userInput = userInput.umod(ecCurve.curve.n);
  //     const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

  //     // generate and delete
  //     const { newShareIndex: shareIndex1 } = await tb.generateNewShare();
  //     await tb.deleteShare(shareIndex1);

  //     const { newShareStores: shareStores, newShareIndex: shareIndex } = await tb.generateNewShare();

  //     const stringified = JSON.stringify(tb);
  //     const tb2 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: sp, storageLayer: customSL });
  //     if (tb2.manualSync !== mode) {
  //       fail(`manualSync should be ${mode}`);
  //     }
  //     const finalKey = await tb2.reconstructKey();
  //     const shareToVerify = tb2.outputShareStore(shareIndex);
  //     // TODO: tb2.generateNewShare()
  //     strictEqual(shareStores[shareIndex.toString("hex")].share.share.toString("hex"), shareToVerify.share.share.toString("hex"));
  //     await tb2.syncLocalMetadataTransitions();
  //     strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

  //     const reconstructedKey2 = await tb2.reconstructKey();
  //     if (resp1.privKey.cmp(reconstructedKey2.privKey) !== 0) {
  //       fail("key should be able to be reconstructed");
  //     }
  //   });

  //   it(`#should serialize and deserialize correctly keeping localTransitions afterNewKeyAssign, manualSync=${mode}`, async function () {
  //     if (!customSP.useTSS) this.skip();
  //     let userInput = new BN(keccak256(Buffer.from("user answer blublu", "utf-8")).slice(2), "hex");
  //     userInput = userInput.umod(ecCurve.curve.n);
  //     const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });
  //     // TODO: tss initialize
  //     await tb.syncLocalMetadataTransitions();
  //     const reconstructedKey = await tb.reconstructKey();
  //     // TODO: reconstruct tss key
  //     const { newShareStores: shareStores, newShareIndex: shareIndex } = await tb.generateNewShare();

  //     const stringified = JSON.stringify(tb);
  //     const tb2 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: customSP, storageLayer: customSL });
  //     const finalKey = await tb2.reconstructKey();
  //     // TODO: reconstruct tss key
  //     const shareToVerify = tb2.outputShareStore(shareIndex);
  //     strictEqual(shareStores[shareIndex.toString("hex")].share.share.toString("hex"), shareToVerify.share.share.toString("hex"));
  //     await tb2.syncLocalMetadataTransitions();
  //     strictEqual(finalKey.privKey.toString("hex"), reconstructedKey.privKey.toString("hex"), "Incorrect serialization");
  //     // TODO: both tss keys should be the same

  //     const reconstructedKey2 = await tb2.reconstructKey();
  //     if (resp1.privKey.cmp(reconstructedKey2.privKey) !== 0) {
  //       fail("key should be able to be reconstructed");
  //     }
  //   });

  //   it(`#should not be able to updateSDK with newKeyAssign transitions unsynced, manualSync=${mode}`, async function () {
  //     await tb._initializeNewKey({ initializeModules: true });
  //     // TODO: initialize new tss key
  //     const stringified = JSON.stringify(tb);
  //     const tb2 = await ThresholdKey.fromJSON(JSON.parse(stringified), {});

  //     if (mode) {
  //       // Can't updateSDK, please do key assign.
  //       await rejects(async function () {
  //         await tb2.updateSDK(); // TODO: does this need params? update function to handle TSS in tb.initialize core.ts:1130
  //       }, Error);
  //     }
  //     // create new key because the state might have changed after updateSDK()
  //     const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), {});
  //     await tb3.generateNewShare();
  //     await tb3.syncLocalMetadataTransitions();
  //     await tb3.updateSDK();
  //   });
  // });
});
