/* eslint-disable no-shadow */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
import { ecCurve } from "@tkey/common-types";
import PrivateKeyModule, { SECP256k1Format } from "@tkey/private-keys";
import SecurityQuestionsModule from "@tkey/security-questions";
import SeedPhraseModule, { MetamaskSeedPhraseFormat } from "@tkey/seed-phrase";
import ServiceProviderBase from "@tkey/service-provider-base";
import ShareTransferModule from "@tkey/share-transfer";
import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";
import { deepStrictEqual, fail, notStrictEqual, rejects, strict, strictEqual } from "assert";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

import ThresholdKey from "../src/index";

function initStorageLayer(mocked, extraParams) {
  return mocked === "true" ? new MockStorageLayer({ serviceProvider: extraParams.serviceProvider }) : new TorusStorageLayer(extraParams);
}

const mocked = process.env.MOCKED || "false";
const metadataURL = process.env.METADATA || "http://localhost:5051";
const PRIVATE_KEY = generatePrivate().toString("hex");
const defaultSP = new ServiceProviderBase({ postboxKey: PRIVATE_KEY });
const defaultSL = initStorageLayer(mocked, { serviceProvider: defaultSP, hostUrl: metadataURL });

function getTempKey() {
  return generatePrivate().toString("hex");
}
function compareBNArray(a, b, message) {
  if (a.length !== b.length) throw new Error(message);
  return a.map((el) => {
    // console.log(el, b[index], el.cmp(b[index]));
    const found = b.find((pl) => pl.cmp(el) === 0);
    if (!found) throw new Error(message);
    return 0;
  });
}

function compareReconstructedKeys(a, b, message) {
  // eslint-disable-next-line no-unused-expressions
  if (a.privKey.cmp(b.privKey) !== 0) throw new Error(message);
  if (a.seedPhraseModule && b.seedPhraseModule) {
    compareBNArray(a.seedPhraseModule, b.seedPhraseModule, message);
  }
  if (a.privateKeyModule && b.privateKeyModule) {
    compareBNArray(a.privateKeyModule, b.privateKeyModule, message);
  }
  if (a.allKeys && b.allKeys) {
    compareBNArray(a.allKeys, b.allKeys, message);
  }
}

const manualSyncModes = [true, false];
manualSyncModes.forEach((mode) => {
  describe("tkey", function () {
    let tb;
    beforeEach("Setup ThresholdKey", async function () {
      tb = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
    });
    it("#should be able to initializeNewKey using initialize", async function () {
      const sp = defaultSP;
      sp.postboxKey = new BN(getTempKey(), "hex");
      const sl = initStorageLayer(mocked, { serviceProvider: sp, hostUrl: metadataURL });
      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer: sl, manualSync: mode });
      await tb2.initialize();
      await tb2.reconstructKey();
      await tb2.syncLocalMetadataTransitions();
    });

    it(`#should be able to reconstruct key when initializing a key, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ neverInitializeNewKey: true });
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to reconstruct key when initializing with user input, manualSync=${mode}`, async function () {
      let determinedShare = new BN(keccak256("user answer blublu").slice(2), "hex");
      determinedShare = determinedShare.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ determinedShare, initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize();
      tb2.inputShareStore(resp1.userShare);
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to generate and delete shares, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      const { newShareStores: newShareStores1, newShareIndex: newShareIndex1 } = await tb.generateNewShare();
      const { newShareStores } = await tb.deleteShare(newShareIndex1);
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: tb.serviceProvider, storageLayer: tb.storageLayer });
      await tb2.initialize();
      // tb2.inputShareStore(resp1.deviceShare);
      tb2.inputShareStore(newShareStores1[newShareIndex1.toString("hex")]);
      const newKeys = Object.keys(newShareStores);
      if (newKeys.find((el) => el === newShareIndex1.toString("hex"))) {
        fail("Unable to delete share index");
      }
    });
    it(`#should not be able to delete more than threshold number of shares, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      const { newShareIndex: newShareIndex1 } = await tb.generateNewShare();
      const { newShareIndex: newShareIndex2 } = await tb.generateNewShare();
      await tb.deleteShare(newShareIndex1);
      await tb.syncLocalMetadataTransitions();

      rejects(async () => {
        await tb.deleteShare(newShareIndex2);
      }, Error);
    });
    it(`#should not be able to initialize with a deleted share, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      const { newShareStores: newShareStores1, newShareIndex: newShareIndex1 } = await tb.generateNewShare();
      await tb.deleteShare(newShareIndex1);
      await tb.syncLocalMetadataTransitions();
      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await rejects(async function () {
        await tb2.initialize({ withShare: newShareStores1[newShareIndex1.toString("hex")] });
      });
    });
    it(`#should not be able to add share post deletion, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      const { newShareStores: newShareStores1, newShareIndex: newShareIndex1 } = await tb.generateNewShare();
      await tb.deleteShare(newShareIndex1);
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize();
      await rejects(async () => {
        await tb2.inputShare(newShareStores1[newShareIndex1.toString("hex")].share.share);
      }, Error);
    });
    it(`#should be able to reshare a key and retrieve from service provider, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ neverInitializeNewKey: true });
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const resp2 = await tb2.generateNewShare();
      await tb2.syncLocalMetadataTransitions();

      const tb3 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb3.initialize();
      tb3.inputShareStore(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
      const finalKey = await tb3.reconstructKey();
      if (resp1.privKey.cmp(finalKey.privKey) !== 0) {
        fail("key should be able to be reconstructed after adding new share");
      }
    });
    it(`#should be able to reconstruct key when initializing a with a share , manualSync=${mode}`, async function () {
      let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
      userInput = userInput.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ withShare: resp1.userShare });
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to output unavailable share store, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      const { newShareStores, newShareIndex } = await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ neverInitializeNewKey: true });
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      const shareStore = await tb2.outputShareStore(newShareIndex);
      strictEqual(newShareStores[newShareIndex.toString("hex")].share.share.toString("hex"), shareStore.share.share.toString("hex"));

      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to reconstruct key after refresh and initializing with a share, manualSync=${mode}`, async function () {
      let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
      userInput = userInput.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });
      const newShares = await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ withShare: resp1.userShare });
      tb2.inputShareStore(newShares.newShareStores[resp1.deviceShare.share.shareIndex.toString("hex")]);
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should serialize and deserialize correctly with user input, manualSync=${mode}`, async function () {
      let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
      userInput = userInput.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });
      const newShares = await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ withShare: resp1.userShare });
      tb2.inputShareStore(newShares.newShareStores[resp1.deviceShare.share.shareIndex.toString("hex")]);
      const reconstructedKey = await tb2.reconstructKey();
      await tb2.syncLocalMetadataTransitions();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const stringified = JSON.stringify(tb2);
      const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
      const finalKey = await tb3.reconstructKey();
      strictEqual(finalKey.toString("hex"), reconstructedKey.toString("hex"), "Incorrect serialization");
    });
    it(`#should serialize and deserialize correctly keeping localTransitions consistent before syncing NewKeyAssign, manualSync=${mode}`, async function () {
      let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
      userInput = userInput.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });

      // generate and delete
      const { newShareIndex: shareIndex1 } = await tb.generateNewShare();
      await tb.deleteShare(shareIndex1);

      const { newShareStores: shareStores, newShareIndex: shareIndex } = await tb.generateNewShare();

      const stringified = JSON.stringify(tb);
      const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
      if (tb3.manualSync !== mode) {
        fail(`manualSync should be ${mode}`);
      }
      const finalKey = await tb3.reconstructKey();
      const shareToVerify = tb3.outputShareStore(shareIndex);
      strictEqual(shareStores[shareIndex.toString("hex")].share.share.toString("hex"), shareToVerify.share.share.toString("hex"));
      await tb3.syncLocalMetadataTransitions();
      strictEqual(finalKey.privKey.toString("hex"), resp1.privKey.toString("hex"), "Incorrect serialization");

      const tb4 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb4.initialize({ withShare: resp1.userShare });
      tb4.inputShareStore(shareStores[shareIndex.toString("hex")]);
      const reconstructedKey2 = await tb4.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey2.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should serialize and deserialize correctly keeping localTransitions consistant afterNewKeyAssign, manualSync=${mode}`, async function () {
      let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
      userInput = userInput.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ userInput, initializeModules: true });
      const newShares = await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize({ withShare: resp1.userShare });
      tb2.inputShareStore(newShares.newShareStores[resp1.deviceShare.share.shareIndex.toString("hex")]);
      const reconstructedKey = await tb2.reconstructKey();
      // this will test fromJSON in manualSync:true
      const { newShareStores: shareStores, newShareIndex: shareIndex } = await tb2.generateNewShare();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const stringified = JSON.stringify(tb2);
      const sharez = tb2.shares[tb2.lastFetchedCloudMetadata.getLatestPublicPolynomial().getPolynomialID()];
      await defaultSL.getMetadata({ privKey: sharez["1"] });
      const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
      const finalKey = await tb3.reconstructKey();
      const shareToVerify = tb3.outputShareStore(shareIndex);
      strictEqual(shareStores[shareIndex.toString("hex")].share.share.toString("hex"), shareToVerify.share.share.toString("hex"));
      await tb3.syncLocalMetadataTransitions();
      strictEqual(finalKey.privKey.toString("hex"), reconstructedKey.privKey.toString("hex"), "Incorrect serialization");

      const tb4 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb4.initialize({ withShare: resp1.userShare });
      tb4.inputShareStore(shareStores[shareIndex.toString("hex")]);

      const reconstructedKey2 = await tb4.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey2.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to reshare a key and retrieve from service provider serialization, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const resp2 = await tb2.generateNewShare();
      await tb2.syncLocalMetadataTransitions();

      const tb3 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb3.initialize();
      tb3.inputShareStore(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
      const finalKey = await tb3.reconstructKey();
      // compareBNArray(resp1.privKey, finalKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(finalKey.privKey) !== 0) {
        fail("key should be able to be reconstructed after adding new share");
      }

      const stringified = JSON.stringify(tb3);
      const tb4 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      const finalKeyPostSerialization = await tb4.reconstructKey();
      strictEqual(finalKeyPostSerialization.toString("hex"), finalKey.toString("hex"), "Incorrect serialization");
    });
    it(`#should be able to serialize and deserialize without service provider and storage layer, manualSync=${mode}`, async function () {
      const defaultSP2 = new ServiceProviderBase({});
      const defaultSL2 = initStorageLayer(mocked, { serviceProvider: defaultSP2, hostUrl: metadataURL });
      const tb = new ThresholdKey({ serviceProvider: defaultSP2, storageLayer: defaultSL2, manualSync: mode });
      tb.serviceProvider.postboxKey = new BN(generatePrivate());
      await tb._initializeNewKey({ initializeModules: true });
      const stringified = JSON.stringify(tb);

      // initialize is expected to fail without any share
      if (!mode) {
        await rejects(async function () {
          const newSP = new ServiceProviderBase({});
          await ThresholdKey.fromJSON(JSON.parse(stringified), {
            serviceProvider: newSP,
            storageLayer: initStorageLayer(mocked, { serviceProvider: newSP, hostUrl: metadataURL }),
          });
        }, Error);
      }
    });
    it(`#should not be able to updateSDK with newKeyAssign in manualSync=true`, async function () {
      const defaultSP2 = new ServiceProviderBase({});
      const defaultSL2 = initStorageLayer(mocked, { serviceProvider: defaultSP2, hostUrl: metadataURL });
      const tb = new ThresholdKey({ serviceProvider: defaultSP2, storageLayer: defaultSL2, manualSync: mode });
      tb.serviceProvider.postboxKey = new BN(generatePrivate());
      await tb._initializeNewKey({ initializeModules: true });
      const stringified = JSON.stringify(tb);
      const tb4 = await ThresholdKey.fromJSON(JSON.parse(stringified), {});
      if (mode) {
        // Can't updateSDK, please do key assign.
        await rejects(async function () {
          await tb4.updateSDK();
        }, Error);
      }
      // create new key
      await tb4.generateNewShare();
      await tb4.syncLocalMetadataTransitions();
      await tb4.updateSDK();
    });
    it(`#should be able to import and reconstruct an imported key, manualSync=${mode}`, async function () {
      const importedKey = new BN(generatePrivate());
      const resp1 = await tb._initializeNewKey({ importedKey, initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray([importedKey], reconstructedKey, "key should be able to be reconstructed");
      if (importedKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to reconstruct key, even with old metadata, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize(); // initialize sdk with old metadata
      tb.generateNewShare(); // generate new share to update metadata
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey(); // reconstruct key with old metadata should work to poly
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to not create a new key if initialize is called with neverInitializeNewKey, manualSync=${mode}`, async function () {
      const newSP = new ServiceProviderBase({ postboxKey: new BN(generatePrivate()).toString("hex") });
      const tb2 = new ThresholdKey({ serviceProvider: newSP, storageLayer: defaultSL });
      rejects(async () => {
        await tb2.initialize({ neverInitializeNewKey: true });
      }, Error);
    });
    it(`#should be able to update metadata, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();
      // nonce 0

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      await tb2.reconstructKey();

      // try creating new shares
      await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      await rejects(async () => {
        await tb2.generateNewShare();
        await tb2.syncLocalMetadataTransitions();
      }, Error);

      // try creating again
      const newtb = await tb2.updateSDK();
      await newtb.reconstructKey();
      await newtb.generateNewShare();
      await newtb.syncLocalMetadataTransitions();
    });
  });

  describe("tkey reconstruction", function () {
    it(`#should be able to detect a new user and reconstruct key on initialize, manualSync=${mode}`, async function () {
      const privKey = new BN(generatePrivate());
      const uniqueSP = new ServiceProviderBase({ postboxKey: privKey.toString("hex") });
      const uniqueSL = initStorageLayer(mocked, { serviceProvider: uniqueSP, hostUrl: metadataURL });
      const tb = new ThresholdKey({ serviceProvider: uniqueSP, storageLayer: uniqueSL });
      await tb.initialize();
      const reconstructedKey = await tb.reconstructKey();
      // compareBNArray(tb.getKey(), reconstructedKey, "key should be able to be reconstructed");
      if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
  });

  describe("TorusStorageLayer", function () {
    it(`#should get or set correctly, manualSync=${mode}`, async function () {
      const privKey = PRIVATE_KEY;
      const tsp = new ServiceProviderBase({ postboxKey: privKey });
      const storageLayer = initStorageLayer(mocked, { hostUrl: metadataURL, serviceProvider: tsp });
      const message = { test: Math.random().toString(36).substring(7) };
      await storageLayer.setMetadata({ input: message, privKey: tsp.postboxKey });
      const resp = await storageLayer.getMetadata({ privKey: tsp.postboxKey });
      deepStrictEqual(resp, message, "set and get message should be equal");
    });
    it(`#should get or set with specified private key correctly, manualSync=${mode}`, async function () {
      const privKey = PRIVATE_KEY;
      const privKeyBN = new BN(privKey, 16);
      const tsp = new ServiceProviderBase({ postboxKey: privKey });
      const storageLayer = initStorageLayer(mocked, { hostUrl: metadataURL, serviceProvider: tsp });
      const message = { test: Math.random().toString(36).substring(7) };
      await storageLayer.setMetadata({ input: message, privKey: privKeyBN });
      const resp = await storageLayer.getMetadata({ privKey: privKeyBN });
      deepStrictEqual(resp, message, "set and get message should be equal");
    });
    it(`#should get or set with array of specified private keys correctly, manualSync=${mode}`, async function () {
      const privKey = generatePrivate().toString("hex");
      const privKeyBN = new BN(privKey, 16);
      const tsp = new ServiceProviderBase({ postboxKey: privKey });
      const storageLayer = initStorageLayer(mocked, { hostUrl: metadataURL, serviceProvider: tsp });
      const message = { test: Math.random().toString(36).substring(7) };

      // const messages = [];
      // for (let i = 0; i < 4; i += 1) {
      //   messages.push({ test: Math.random().toString(36).substring(7) });
      // }

      // const privateKeys = [];
      // for (let i = 0; i < 4; i += 1) {
      //   privateKeys.push(generatePrivate().toString("hex"));
      // }

      const privKey2 = generatePrivate().toString("hex");
      const privKeyBN2 = new BN(privKey2, 16);
      const message2 = { test: Math.random().toString(36).substring(7) };

      await storageLayer.setMetadataStream({ input: [message, message2], privKey: [privKeyBN, privKeyBN2] });
      const resp = await storageLayer.getMetadata({ privKey: privKeyBN });

      const resp2 = await storageLayer.getMetadata({ privKey: privKeyBN2 });
      deepStrictEqual(resp, message, "set and get message should be equal");
      deepStrictEqual(resp2, message2, "set and get message should be equal");
    });
    it(`#should be able to get/set bulk correctly, manualSync=${mode}`, async function () {
      const privkeys = [];
      const messages = [];
      for (let i = 0; i < 10; i += 1) {
        privkeys.push(new BN(generatePrivate()));
        messages.push({ test: Math.random().toString(36).substring(7) });
      }
      const tsp = new ServiceProviderBase({ postboxKey: privkeys[0].toString("hex") });
      const storageLayer = initStorageLayer(mocked, { hostUrl: metadataURL, serviceProvider: tsp });
      await storageLayer.setMetadataStream({ input: [...messages], privKey: [...privkeys] });
      const responses = await Promise.all(privkeys.map((el) => storageLayer.getMetadata({ privKey: el })));
      for (let i = 0; i < 10; i += 1) {
        deepStrictEqual(responses[i], messages[i], "set and get message should be equal");
      }
    });
  });

  describe("SecurityQuestionsModule", function () {
    let tb;
    beforeEach("initialize security questions module", async function () {
      tb = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
        manualSync: mode,
      });
    });
    it(`#should be able to reconstruct key and initialize a key with security questions, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await rejects(async function () {
        await tb.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
      }, Error);

      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
      await tb.syncLocalMetadataTransitions();
      const question = tb.modules.securityQuestions.getSecurityQuestions();
      strictEqual(question, "who is your cat?");
      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
      });
      await tb2.initialize();

      // wrong password
      await rejects(async function () {
        await tb.modules.securityQuestions.inputShareFromSecurityQuestions("blublu-wrong");
      }, Error);

      await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to delete and add security questions, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
      await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      // delete sq
      const sqIndex = tb.metadata.generalStore.securityQuestions.shareIndex;
      await tb.deleteShare(sqIndex);

      // add sq again
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blubluss", "who is your cat?");
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
      });
      await tb2.initialize();

      await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("blubluss");
      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to reconstruct key and initialize a key with security questions after refresh, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
      });
      await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      await tb2.initialize();

      await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to change password, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });

      // should throw
      await rejects(async function () {
        await tb.modules.securityQuestions.changeSecurityQuestionAndAnswer("dodo", "who is your cat?");
      }, Error);

      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
      await tb.modules.securityQuestions.changeSecurityQuestionAndAnswer("dodo", "who is your cat?");
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
      });
      await tb2.initialize();

      await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("dodo");
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to change password and serialize, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
      await tb.modules.securityQuestions.changeSecurityQuestionAndAnswer("dodo", "who is your cat?");
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
      });
      await tb2.initialize();

      await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("dodo");
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const stringified = JSON.stringify(tb2);
      const tb4 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
      const finalKeyPostSerialization = await tb4.reconstructKey();
      strictEqual(finalKeyPostSerialization.toString("hex"), reconstructedKey.toString("hex"), "Incorrect serialization");
    });
    it(`#should be able to get answers, even when they change, manualSync=${mode}`, async function () {
      tb = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule(true) },
      });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      const qn = "who is your cat?";
      const ans1 = "blublu";
      const ans2 = "dodo";
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(ans1, qn);
      let gotAnswer = await tb.modules.securityQuestions.getAnswer();
      if (gotAnswer !== ans1) {
        fail("answers should be the same");
      }
      await tb.modules.securityQuestions.changeSecurityQuestionAndAnswer(ans2, qn);
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        storageLayer: defaultSL,
        modules: { securityQuestions: new SecurityQuestionsModule(true) },
      });
      await tb2.initialize();

      await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("dodo");
      const reconstructedKey = await tb2.reconstructKey();
      // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      gotAnswer = await tb2.modules.securityQuestions.getAnswer();
      if (gotAnswer !== ans2) {
        fail("answers should be the same");
      }
    });
  });

  describe("ShareTransferModule", function () {
    it(`#should be able to transfer share via the module, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      await tb2.initialize();

      // usually should be called in callback, but mocha does not allow
      const pubkey = await tb2.modules.shareTransfer.requestNewShare();

      const result = await tb.generateNewShare();

      await tb.modules.shareTransfer.approveRequest(pubkey, result.newShareStores[result.newShareIndex.toString("hex")]);
      await tb.syncLocalMetadataTransitions();

      await tb2.modules.shareTransfer.startRequestStatusCheck(pubkey);

      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });

    it(`#should be able to change share transfer pointer after share deletion, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      await tb._initializeNewKey({ initializeModules: true });
      const firstShareTransferPointer = tb.metadata.generalStore.shareTransfer.pointer.toString("hex");
      const { newShareIndex: newShareIndex1 } = await tb.generateNewShare();
      const secondShareTransferPointer = tb.metadata.generalStore.shareTransfer.pointer.toString("hex");

      strictEqual(firstShareTransferPointer, secondShareTransferPointer);

      await tb.syncLocalMetadataTransitions();
      await tb.deleteShare(newShareIndex1);
      const thirdShareTransferPointer = tb.metadata.generalStore.shareTransfer.pointer.toString("hex");

      notStrictEqual(secondShareTransferPointer, thirdShareTransferPointer);
      await tb.syncLocalMetadataTransitions();
    });

    it(`#should be able to transfer device share, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      await tb2.initialize();
      const currentShareIndexes = tb2.getCurrentShareIndexes();
      // usually should be called in callback, but mocha does not allow
      const pubkey = await tb2.modules.shareTransfer.requestNewShare("unit test", currentShareIndexes);

      const requests = await tb.modules.shareTransfer.getShareTransferStore();
      const pubkey2 = Object.keys(requests)[0];
      await tb.modules.shareTransfer.approveRequest(pubkey2);

      await tb2.modules.shareTransfer.startRequestStatusCheck(pubkey, true);

      // eslint-disable-next-line promise/param-names
      // await new Promise((res) => {
      //   setTimeout(res, 1001);
      // });

      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to delete share transfer from another device, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      await tb2.initialize();

      // usually should be called in callback, but mocha does not allow
      const encKey2 = await tb2.modules.shareTransfer.requestNewShare();
      await tb.modules.shareTransfer.deleteShareTransferStore(encKey2); // delete 1st request from 2nd
      const newRequests = await tb2.modules.shareTransfer.getShareTransferStore();
      // console.log(newRequests)
      if (encKey2 in newRequests) {
        fail("Unable to delete share transfer request");
      }
    });
    it(`#should be able to reset share transfer store, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
      await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      await tb.modules.shareTransfer.resetShareTransferStore();
      const newRequests = await tb.modules.shareTransfer.getShareTransferStore();
      if (Object.keys(newRequests).length !== 0) {
        fail("Unable to reset share store");
      }
    });
  });

  describe("ShareSerializationModule", function () {
    it(`#should be able to serialize and deserialize share, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
      });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });

      // should throw
      await rejects(async function () {
        await tb.outputShare(resp1.deviceShare.share.shareIndex, "mnemonic-49");
      });

      const exportedSeedShare = await tb.outputShare(resp1.deviceShare.share.shareIndex, "mnemonic");
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
      });
      await tb2.initialize();

      // should throw
      await rejects(async function () {
        await tb2.inputShare(exportedSeedShare.toString("hex"), "mnemonic-49");
      });

      await tb2.inputShare(exportedSeedShare.toString("hex"), "mnemonic");
      const reconstructedKey = await tb2.reconstructKey();

      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
  });

  describe("TkeyStore", function () {
    let tb;
    let metamaskSeedPhraseFormat;
    let privateKeyFormat;
    beforeEach("Setup ThresholdKey", async function () {
      metamaskSeedPhraseFormat = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
      privateKeyFormat = new SECP256k1Format();

      tb = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat]), privateKeyModule: new PrivateKeyModule([privateKeyFormat]) },
      });
    });
    it(`#should not to able to initalize without seedphrase formats, manualSync=${mode}`, async function () {
      const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { seedPhrase: new SeedPhraseModule([]), privateKeyModule: new PrivateKeyModule([]) },
      });
      await tb2._initializeNewKey({ initializeModules: true });
      // should throw
      await rejects(async () => {
        await tb2.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet);
      }, Error);

      await rejects(async () => {
        await tb2.modules.seedPhrase.setSeedPhrase("HD Key Tree", `${seedPhraseToSet}123`);
      }, Error);

      // should throw
      await rejects(async () => {
        const actualPrivateKeys = [new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex")];
        await tb2.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0].toString("hex"));
      }, Error);

      await rejects(async () => {
        const actualPrivateKeys = [new BN("4bd0041a9b16a7268a5de7982f2422b15635c4fd170c140dc48976wqerwer0", "hex")];
        await tb2.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0].toString("hex"));
      }, Error);
    });
    it(`#should get/set multiple seed phrase, manualSync=${mode}`, async function () {
      const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
      const seedPhraseToSet2 = "object brass success calm lizard science syrup planet exercise parade honey impulse";
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet);
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet2);
      await tb.syncLocalMetadataTransitions();
      const returnedSeed = await tb.modules.seedPhrase.getSeedPhrases();
      strictEqual(returnedSeed[0].seedPhrase, seedPhraseToSet);
      strictEqual(returnedSeed[1].seedPhrase, seedPhraseToSet2);

      const metamaskSeedPhraseFormat2 = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat2]) },
      });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstuctedKey = await tb2.reconstructKey();
      await tb.modules.seedPhrase.getSeedPhrasesWithAccounts();

      compareReconstructedKeys(reconstuctedKey, {
        privKey: resp1.privKey,
        seedPhraseModule: [
          new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
          new BN("bfdb025a1d404212c3f9ace6c5fb4185087281dcb9c1e89087d1a3a423f80d22", "hex"),
        ],
        allKeys: [
          resp1.privKey,
          new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
          new BN("bfdb025a1d404212c3f9ace6c5fb4185087281dcb9c1e89087d1a3a423f80d22", "hex"),
        ],
      });
    });
    it(`#should be able to derive keys, manualSync=${mode}`, async function () {
      const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
      await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet);
      await tb.syncLocalMetadataTransitions();

      const actualPrivateKeys = [new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex")];
      const derivedKeys = await tb.modules.seedPhrase.getAccounts();
      compareBNArray(actualPrivateKeys, derivedKeys, "key should be same");
    });

    it(`#should be able to generate seed phrase if not given, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree");
      await tb.syncLocalMetadataTransitions();

      const [seed] = await tb.modules.seedPhrase.getSeedPhrases();
      const derivedKeys = await tb.modules.seedPhrase.getAccounts();
      strict(metamaskSeedPhraseFormat.validateSeedPhrase(seed.seedPhrase), "Seed Phrase must be valid");
      strict(derivedKeys.length >= 1, "Atleast one account must be generated");
    });

    it(`#should be able to change seedphrase, manualSync=${mode}`, async function () {
      const oldSeedPhrase = "verb there excuse wink merge phrase alien senior surround fluid remind chef bar move become";
      await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", oldSeedPhrase);
      // await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree");
      await tb.syncLocalMetadataTransitions();

      const newSeedPhrase = "trim later month olive fit shoulder entry laptop jeans affair belt drip jealous mirror fancy";
      await tb.modules.seedPhrase.CRITICAL_changeSeedPhrase(oldSeedPhrase, newSeedPhrase);
      await tb.syncLocalMetadataTransitions();

      const secondStoredSeedPhrases = await tb.modules.seedPhrase.getSeedPhrases();

      strictEqual(secondStoredSeedPhrases[0].seedPhrase, newSeedPhrase);
    });

    it(`#should be able to replace numberOfWallets seed phrase module, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree");
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree");
      const seedPhraseStores = await tb.modules.seedPhrase.getSeedPhrases();
      // console.log("%O", tb.metadata.tkeyStore);
      await tb.modules.seedPhrase.setSeedPhraseStoreItem({
        id: seedPhraseStores[1].id,
        seedPhrase: seedPhraseStores[1].seedPhrase,
        numberOfWallets: 2,
      });
      await tb.syncLocalMetadataTransitions();

      // console.log(storedSeedPhrase);
      const secondStoredSeedPhrases = await tb.modules.seedPhrase.getSeedPhrases();
      strictEqual(secondStoredSeedPhrases[0].numberOfWallets, 1);
      strictEqual(secondStoredSeedPhrases[1].numberOfWallets, 2);
    });

    it(`#should be able to get/set private key, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });

      const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      ];
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0]);
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[1]);
      await tb.syncLocalMetadataTransitions();
      await tb.modules.privateKeyModule.getAccounts();

      const getAccounts = await tb.modules.privateKeyModule.getAccounts();
      deepStrictEqual(
        actualPrivateKeys.map((x) => x.toString("hex")),
        getAccounts.map((x) => x.toString("hex"))
      );
    });

    it(`#should be able to generate private key if not given, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });

      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n");
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n");
      await tb.syncLocalMetadataTransitions();

      const accounts = await tb.modules.privateKeyModule.getAccounts();
      strictEqual(accounts.length, 2);
    });

    it(`#should be able to get/set private keys and seed phrase, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });

      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", "seed sock milk update focus rotate barely fade car face mechanic mercy");
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", "chapter gas cost saddle annual mouse chef unknown edit pen stairs claw");

      const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      ];
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0]);
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[1]);
      await tb.syncLocalMetadataTransitions();

      const metamaskSeedPhraseFormat2 = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
      const tb2 = new ThresholdKey({
        serviceProvider: defaultSP,
        manualSync: mode,
        storageLayer: defaultSL,
        modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat2]), privateKeyModule: new PrivateKeyModule([privateKeyFormat]) },
      });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();

      compareReconstructedKeys(reconstructedKey, {
        privKey: resp1.privKey,
        seedPhraseModule: [
          new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
          new BN("4d62a55af3496a7b290a12dd5fd5ef3e051d787dbc005fb74536136949602f9e", "hex"),
        ],
        privateKeyModule: [
          new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
          new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
        ],
        allKeys: [
          resp1.privKey,
          new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
          new BN("4d62a55af3496a7b290a12dd5fd5ef3e051d787dbc005fb74536136949602f9e", "hex"),
          new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
          new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
        ],
      });

      const reconstructedKey2 = await tb2.reconstructKey(false);
      compareReconstructedKeys(reconstructedKey2, {
        privKey: resp1.privKey,
        allKeys: [resp1.privKey],
      });
    });
  });

  describe("Lock", function () {
    it(`#locks should fail when tkey/nonce is updated, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      await tb2.generateNewShare();
      await tb2.syncLocalMetadataTransitions();

      let outsideErr;
      try {
        await tb.generateNewShare();
        await tb.syncLocalMetadataTransitions();
      } catch (err) {
        outsideErr = err;
      }
      if (!outsideErr) {
        fail("should fail");
      }
    });

    it(`#locks should not allow for writes of the same nonce, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      const alltbs = [];
      // make moar tbs
      for (let i = 0; i < 5; i += 1) {
        const temp = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
        await temp.initialize();
        temp.inputShareStore(resp1.deviceShare);
        await temp.reconstructKey();
        alltbs.push(temp);
      }
      // generate shares
      const promises = [];
      for (let i = 0; i < alltbs.length; i += 1) {
        promises.push(alltbs[i].generateNewShare().then((_) => alltbs[i].syncLocalMetadataTransitions()));
      }
      const res = await Promise.allSettled(promises);

      let count = 0;
      for (let i = 0; i < res.length; i += 1) {
        if (res[i].status === "fulfilled") count += 1;
      }
      if (count !== 1) {
        fail("fulfilled count != 1");
      }
    });

    it(`#locks should fail when tkey/nonce is updated in non-manualSync mode, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({ serviceProvider: defaultSP, manualSync: mode, storageLayer: defaultSL });
      await tb2.initialize();
      tb2.inputShareStore(resp1.deviceShare);
      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
      await tb2.generateNewShare();
      await tb2.syncLocalMetadataTransitions();

      await rejects(async () => {
        await tb.generateNewShare();
        await tb.generateNewShare();
        await tb.syncLocalMetadataTransitions();
      }, Error);
    });
  });
});
