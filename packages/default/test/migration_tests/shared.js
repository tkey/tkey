/* eslint-disable no-console */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable mocha/no-exports */
/* eslint-disable import/no-extraneous-dependencies */

import { ecCurve } from "@tkey/common-types";
import PrivateKeyModule, { ED25519Format, SECP256K1Format } from "@tkey/private-keys";
import SecurityQuestionsModule from "@tkey/security-questions";
import SeedPhraseModule, { MetamaskSeedPhraseFormat } from "@tkey/seed-phrase";
import TorusServiceProvider from "@tkey/service-provider-torus";
import ShareTransferModule from "@tkey/share-transfer";
import { MockStorageLayer } from "@tkey/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";
import { deepStrictEqual, fail, strictEqual, throws } from "assert";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

import ThresholdKey from "../../src/index";
import { getMetadataUrl, initStorageLayer, isMocked } from "../helpers";
import { ThresholdKeyMockWasm, ThresholdKeyWasm } from "./wasm-nodejs/tkey";

const newSP = (privateKey) => {
  return new TorusServiceProvider({
    postboxKey: privateKey,
    customAuthArgs: {
      // this url has no effect as postbox key is passed
      // passing it just to satisfy direct auth checks.
      baseUrl: "http://localhost:3000",
    },
  });
};

const rejects = async (fn, error, msg) => {
  let f = () => {};
  try {
    await fn();
  } catch (e) {
    f = () => {
      throw e;
    };
  } finally {
    throws(f, error, msg);
  }
};

const metadataURL = getMetadataUrl();

function getTempKey() {
  return generatePrivate().toString("hex");
}
// function compareBNArray(a, b, message) {
//   if (a.length !== b.length) throw new Error(message);
//   return a.map((el) => {
//     // console.log(el, b[index], el.cmp(b[index]));
//     const found = b.find((pl) => pl.cmp(el) === 0);
//     if (!found) throw new Error(message);
//     return 0;
//   });
// }

// function compareReconstructedKeys(a, b, message) {
//   if (a.privKey.cmp(b.privKey) !== 0) throw new Error(message);
//   if (a.seedPhraseModule && b.seedPhraseModule) {
//     compareBNArray(a.seedPhraseModule, b.seedPhraseModule, message);
//   }
//   if (a.privateKeyModule && b.privateKeyModule) {
//     compareBNArray(a.privateKeyModule, b.privateKeyModule, message);
//   }
//   if (a.allKeys && b.allKeys) {
//     compareBNArray(a.allKeys, b.allKeys, message);
//   }
// }

export const sharedTestCases = (mode, torusSP, storageLayer) => {
  const customSP = torusSP;
  const customSL = storageLayer;

  const createThresholdWasm = (postboxKey, storage) => {
    if (isMocked) {
      const threshold_wasm = new ThresholdKeyMockWasm(postboxKey);
      // update storage if provided ( initialize key if storage not provided)
      if (storage) threshold_wasm.storage_layer_from_json(JSON.stringify(storage));
      return threshold_wasm;
    }
    // else return cloud storage Threshold
    return new ThresholdKeyWasm(postboxKey);
  };


  describe("tkey rust", function () {
    let tb;
    beforeEach("Setup ThresholdKey", async function () {
      tb = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync: mode });
    });

    it.only("#should be able to create Tkey in TS and reconstruct it in Tkey Rust", async function () {
      const postboxKey = getTempKey();
      const storageLayer = initStorageLayer({ hostUrl: metadataURL });
      const tkey = new ThresholdKey({ serviceProvider: newSP(postboxKey), storageLayer, manualSync: mode });
      await tkey.initialize();
      const reconstructedKey = await tkey.reconstructKey();
      await tkey.syncLocalMetadataTransitions();
      if (tkey.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const deviceIndex = tkey.getCurrentShareIndexes().filter((el) => el !== "1")[0];
      const deviceShare = await tkey.outputShare(deviceIndex);
      const storage_after_ts = tkey.storageLayer.toJSON();

      // wasm reconstruct the key
      const threshold_wasm = createThresholdWasm(postboxKey, storage_after_ts);

      threshold_wasm.initialize();
      threshold_wasm.import_share(deviceShare.toString("hex"));
      threshold_wasm.reconstruct_key(false);

      if (tkey.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      // free memory
      threshold_wasm.free();
    });

    it.only(`#should be able to reconstruct key after TKey created in tkey-rust, manualSync=${mode}`, async function () {
      // wasm initialize key
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      threshold_wasm.initialize();
      threshold_wasm.reconstruct_key(false);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);
      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());

      const tkey = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
        manualSync: mode,
      });
      await tkey.initialize();

      // expecting to fail due to missing device share
      try {
        await tkey.reconstructKey();
        fail("should not be able to reconstruct key");
      } catch (e) {}

      await tkey.inputShare(deviceShare);
      await tkey.reconstructKey();

      if (tkey.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      threshold_wasm.free();
    });

    it.only(`#should be able to reconstruct key when initializing with user input in TS and reconstruct in Tkey Rust, manualSync=${mode}`, async function () {
      let determinedShare = new BN(keccak256("user answer blublu").slice(2), "hex");
      determinedShare = determinedShare.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ determinedShare, initializeModules: true });
      await tb.reconstructKey();
      await tb.syncLocalMetadataTransitions();

      const storage_after_ts = tb.storageLayer.toJSON();
      // wasm reconstruct the key
      const threshold_wasm = createThresholdWasm(customSP.postboxKey.toString("hex"), storage_after_ts);

      threshold_wasm.initialize();
      threshold_wasm.import_share_store(JSON.stringify(resp1.userShare));
      threshold_wasm.reconstruct_key(false);

      if (resp1.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      // free memory
      threshold_wasm.free();
    });

    it.only(`#should be able to generate and delete share and delete Tkey, manualSync=${mode}`, async function () {
      // long scenario
      // create 2/2 in rust
      // wasm initialize key
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      threshold_wasm.initialize();
      threshold_wasm.reconstruct_key(false);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);

      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());
      threshold_wasm.free();

      // reconstruct in TS and generate new share
      const tkey = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
        manualSync: mode,
      });
      await tkey.initialize();
      await tkey.inputShare(deviceShare);
      await tkey.reconstructKey(true);
      const new_share_result = await tkey.generateNewShare();
      // await tb3.syncLocalMetadataTransitions();
      await tkey.outputShare(new_share_result.newShareIndex.toString("hex"));

      // delete share in rust
      const threshold_wasm_2 = createThresholdWasm(postboxKey, tkey.storageLayer.toJSON());

      threshold_wasm_2.initialize();
      threshold_wasm_2.import_share(deviceShare);
      threshold_wasm_2.reconstruct_key(false);
      threshold_wasm_2.delete_share(new_share_result.newShareIndex.toString("hex"));

      const storage_after_rust_2 = JSON.parse(threshold_wasm_2.json_from_storage_layer());
      threshold_wasm_2.free();

      // reconstruct in TS and delete share
      const tkey_2 = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust_2),
        manualSync: mode,
      });
      await tkey_2.initialize();

      await tkey_2.inputShare(deviceShare);
      // test reconstructiona and check deleted share
      try {
        await tkey_2.reconstructKey(true);
      } catch (e) {
        fail("should be able to reconstruct key");
      }
      try {
        await tkey_2.outputShare(new_share_result.newShareIndex.toString("hex"));
        fail("should not be able to output share");
      } catch (e) {}

      // generate share in rust
      const threshold_wasm_3 = createThresholdWasm(postboxKey, tkey_2.storageLayer.toJSON());
      threshold_wasm_3.initialize();
      threshold_wasm_3.import_share(deviceShare);
      threshold_wasm_3.reconstruct_key(false);
      const rust_generated_share_index = threshold_wasm_3.generate_new_share(new_share_result.newShareIndex.toString("hex"));
      const storage_after_rust_3 = JSON.parse(threshold_wasm_3.json_from_storage_layer());
      threshold_wasm_3.free();

      // reconsturct in TS
      const tkey_3 = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust_3),
        manualSync: mode,
      });
      await tkey_3.initialize();

      await tkey_3.inputShare(deviceShare);
      try {
        await tkey_3.reconstructKey(true);
      } catch (e) {
        fail("should be able to reconstruct key");
      }
      // able to delete new share generated from rust
      await tkey_3.deleteShare(rust_generated_share_index);
      await tkey_3.syncLocalMetadataTransitions();

      // delete tkey in ts
      await tkey_3.CRITICAL_deleteTkey();

      const threshold_wasm_4 = createThresholdWasm(postboxKey, tkey_3.storageLayer.toJSON());
      try {
        threshold_wasm_4.initialize();
        threshold_wasm_4.import_share(deviceShare);
        threshold_wasm_4.reconstruct_key(false);
        fail("should not be able to create tkey with deleted tkey");
      } catch (e) {}
      threshold_wasm_4.free();
    });

    it.only(`#should be able to generate and delete share up to 20 shares, manualSync=${mode}`, async function () {
      // long scenario
      // create 2/2 in rust
      // wasm initialize key
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      threshold_wasm.initialize();
      threshold_wasm.reconstruct_key(false);
      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);
      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());
      threshold_wasm.free();

      // reconstruct in ts
      const tb3 = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
        manualSync: mode,
      });
      await tb3.initialize();
      await tb3.inputShare(deviceShare);
      await tb3.reconstructKey(true);

      let tkey = tb3;
      for (let i = 0; i < 1; i++) {
        console.log("loop", i);
        // generate new share in ts
        const new_share_result = await tkey.generateNewShare();
        // await tb3.syncLocalMetadataTransitions();
        await tkey.outputShare(new_share_result.newShareIndex.toString("hex"));

        // delete share in rust

        const threshold_wasm_2 = createThresholdWasm(postboxKey, tkey.storageLayer.toJSON());
        threshold_wasm_2.initialize();
        threshold_wasm_2.import_share(deviceShare);
        threshold_wasm_2.reconstruct_key(false);
        threshold_wasm_2.delete_share(new_share_result.newShareIndex.toString("hex"));
        const storage_after_rust_2 = JSON.parse(threshold_wasm_2.json_from_storage_layer());
        threshold_wasm_2.free();

        // reconstruct in ts
        const tkey_2 = new ThresholdKey({
          serviceProvider: newSP(postboxKey),
          storageLayer: MockStorageLayer.fromJSON(storage_after_rust_2),
          manualSync: mode,
        });
        await tkey_2.initialize();

        await tkey_2.inputShare(deviceShare);

        try {
          await tkey_2.reconstructKey(true);
        } catch (e) {
          fail("should be able to reconstruct key");
        }

        // check that we can't output deleted share
        try {
          await tkey_2.outputShare(new_share_result.newShareIndex.toString("hex"));
          fail("should not be able to output share");
        } catch (e) {}

        // generate share in rust

        const threshold_wasm_3 = createThresholdWasm(postboxKey, tkey_2.storageLayer.toJSON());
        threshold_wasm_3.initialize();
        threshold_wasm_3.import_share(deviceShare);
        threshold_wasm_3.reconstruct_key(false);
        const newShareIndexWasm = threshold_wasm_3.generate_new_share();
        const storage_after_rust_3 = JSON.parse(threshold_wasm_3.json_from_storage_layer());
        threshold_wasm_3.free();

        const tkey_3 = new ThresholdKey({
          serviceProvider: newSP(postboxKey),
          storageLayer: MockStorageLayer.fromJSON(storage_after_rust_3),
          manualSync: mode,
        });
        await tkey_3.initialize();

        await tkey_3.inputShare(deviceShare);
        try {
          await tkey_3.reconstructKey(true);
        } catch (e) {
          fail("should be able to reconstruct key");
        }

        // delete share in TS
        // able to delete new share generated from rust
        await tkey_3.deleteShare(newShareIndexWasm);
        await tkey_3.syncLocalMetadataTransitions();

        const threshold_wasm_4 = createThresholdWasm(postboxKey, tkey_3.storageLayer.toJSON());
        threshold_wasm_4.initialize();
        threshold_wasm_4.import_share(deviceShare);
        threshold_wasm_4.reconstruct_key(false);

        threshold_wasm_4.generate_new_share();
        threshold_wasm_4.generate_new_share();

        const storage_after_rust_4 = JSON.parse(threshold_wasm_4.json_from_storage_layer());
        threshold_wasm_4.free();

        const tkey_4 = new ThresholdKey({
          serviceProvider: newSP(postboxKey),
          storageLayer: MockStorageLayer.fromJSON(storage_after_rust_4),
          manualSync: mode,
        });
        await tkey_4.initialize();

        await tkey_4.inputShare(deviceShare);
        try {
          await tkey_4.reconstructKey(true);
        } catch (e) {
          fail("should be able to reconstruct key");
        }

        // assign to tkey for loop
        tkey = tkey_4;
      }
    });
  });

  describe("SecurityQuestionsModule", function () {
    let tb;
    beforeEach("initialize security questions module", async function () {
      tb = new ThresholdKey({
        serviceProvider: customSP,
        storageLayer: customSL,
        modules: { securityQuestions: new SecurityQuestionsModule() },
        manualSync: mode,
      });
    });
    it.only(`#should be able to reconstruct key and initialize a key with security questions, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      await rejects(async function () {
        await tb.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
      }, Error);

      const answer = "blublu";

      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer, "who is your cat?");
      await tb.syncLocalMetadataTransitions();
      const question = tb.modules.securityQuestions.getSecurityQuestions();
      strictEqual(question, "who is your cat?");

      // const jsonObj = createJsonObj(tb);

      // const action = "check";
      // const jsonObj_wrong = { ...jsonObj, securityQuestions: { answer: "blublu-wrong", question, action } };
      // const jsonObj_correct = { ...jsonObj, securityQuestions: { answer, question, action } };

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      threshold_wasm.initialize();
      try {
        threshold_wasm.input_share_from_security_questions("blublu-wrong");
        // await test_security_questions_wasm(stringify(jsonObj_wrong));
        fail("should not be able to reconstruct key");
      } catch (e) {}
      threshold_wasm.input_share_from_security_questions(answer);
      threshold_wasm.reconstruct_key(true);
      threshold_wasm.free();
      // const result = await test_security_questions_wasm(stringify(jsonObj_correct));

      // console.log(result);
      // if (resp1.privKey.cmp(result.privKey) !== 0) {
      //   fail("key should be able to be reconstructed");
      // }
    });
    it.only(`#should be able to delete and add security questions, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });

      const answer1 = "blublu";
      const answer2 = "blubluss";
      const question = "who is your cat?";
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer1, question);
      await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      // delete sq
      const sqIndex = tb.metadata.generalStore.securityQuestions.shareIndex;
      await tb.deleteShare(sqIndex);

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      threshold_wasm.initialize();
      try {
        threshold_wasm.input_share_from_security_questions(answer1);
        fail("should not be able to reconstruct key when share is deleted");
      } catch (e) {}
      try {
        threshold_wasm.input_share_from_security_questions(answer2);
        fail("should not be able to reconstruct key when share is deleted");
      } catch (e) {}

      threshold_wasm.free();

      // add sq again
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer2, "who is your cat?");
      await tb.syncLocalMetadataTransitions();

      const threshold_wasm_2 = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      threshold_wasm_2.initialize();

      try {
        threshold_wasm_2.input_share_from_security_questions(answer1);
        fail("should not be able to reconstruct key with wrong answer");
      } catch (e) {}
      threshold_wasm_2.input_share_from_security_questions(answer2);

      threshold_wasm_2.reconstruct_key();
      if (resp1.privKey.toString("hex") !== threshold_wasm_2.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      threshold_wasm_2.free();
    });

    it(`#should be able to reconstruct key and initialize a key with security questions after refresh, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
      const tb2 = new ThresholdKey({
        serviceProvider: customSP,
        storageLayer: customSL,
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
        serviceProvider: customSP,
        storageLayer: customSL,
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
        serviceProvider: customSP,
        storageLayer: customSL,
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
      const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: customSP, storageLayer: customSL });
      const finalKeyPostSerialization = await tb3.reconstructKey();
      strictEqual(finalKeyPostSerialization.toString("hex"), reconstructedKey.toString("hex"), "Incorrect serialization");
    });
    it(`#should be able to get answers, even when they change, manualSync=${mode}`, async function () {
      tb = new ThresholdKey({
        serviceProvider: customSP,
        storageLayer: customSL,
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
        serviceProvider: customSP,
        storageLayer: customSL,
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
    let tb;
    beforeEach("Setup ThresholdKey", async function () {
      tb = new ThresholdKey({
        serviceProvider: customSP,
        manualSync: mode,
        storageLayer: customSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
    });
    it.only(`#should be able to transfer share via the module request from rust, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });

      const threshold = createThresholdWasm(customSP.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      threshold.initialize();

      const encPubX = threshold.request_share_transfer("agent", []);

      const storage_after_rust = threshold.json_from_storage_layer();
      tb.storageLayer = MockStorageLayer.fromJSON(JSON.parse(storage_after_rust));

      const req = await tb.modules.shareTransfer.lookForRequests();
      const newShare = await tb.generateNewShare();
      await tb.modules.shareTransfer.approveRequestWithShareIndex(req[0], newShare.newShareIndex.toString("hex"));

      if (isMocked) threshold.storage_layer_from_json(JSON.stringify(tb.storageLayer.toJSON()));
      threshold.request_status_check_approval(encPubX);

      threshold.reconstruct_key(false);

      threshold.free();
    });

    it.only(`#should be able to transfer share via the module request from rust, manualSync=${mode}`, async function () {
      const threshold = createThresholdWasm(customSP.postboxKey.toString("hex"));
      threshold.initialize();
      threshold.reconstruct_key(false);

      const storage_after_rust = JSON.parse(threshold.json_from_storage_layer());
      const tkey = new ThresholdKey({ serviceProvider: customSP, storageLayer: MockStorageLayer.fromJSON(storage_after_rust), manualSync: mode });
      await tkey.initialize();
      const encPubX_ts = await tkey.modules.shareTransfer.requestNewShare("Tkey From TS", []);
      const storage_after_ts = tkey.storageLayer.toJSON();

      if (isMocked) threshold.storage_layer_from_json(JSON.stringify(storage_after_ts));
      const encPubX = threshold.look_for_request();
      const newShareIndex = threshold.generate_new_share();
      threshold.approve_request_with_share_index(encPubX[0], newShareIndex);

      const storage_after_rust_2 = threshold.json_from_storage_layer();
      tkey.storageLayer = MockStorageLayer.fromJSON(JSON.parse(storage_after_rust_2));
      await tkey.modules.shareTransfer.startRequestStatusCheck(encPubX_ts, true);

      tkey.reconstructKey(false);
      threshold.free();
    });
  });

  describe("TkeyStore", function () {
    let tb;
    let metamaskSeedPhraseFormat;
    let secp256k1Format;
    let ed25519privateKeyFormat;
    beforeEach("Setup ThresholdKey", async function () {
      metamaskSeedPhraseFormat = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
      secp256k1Format = new SECP256K1Format();
      ed25519privateKeyFormat = new ED25519Format();
      tb = new ThresholdKey({
        serviceProvider: customSP,
        manualSync: mode,
        storageLayer: customSL,
        modules: {
          seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat]),
          privateKeyModule: new PrivateKeyModule([secp256k1Format, ed25519privateKeyFormat]),
        },
      });
    });

    it.only(`#should get/set multiple seed phrase, manualSync=${mode}`, async function () {
      const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
      const seedPhraseToSet2 = "object brass success calm lizard science syrup planet exercise parade honey impulse";
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet);
      await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet2);
      await tb.syncLocalMetadataTransitions();
      const returnedSeed = await tb.modules.seedPhrase.getSeedPhrases();
      strictEqual(returnedSeed[0].seedPhrase, seedPhraseToSet);
      strictEqual(returnedSeed[1].seedPhrase, seedPhraseToSet2);

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      threshold_wasm.initialize();

      try {
        threshold_wasm.get_module_private_keys();
        fail("should not be able to get private keys");
      } catch (e) {
        // pass
      }

      threshold_wasm.import_share_store(JSON.stringify(resp1.deviceShare));
      threshold_wasm.reconstruct_key(true);
      const seeds = threshold_wasm.get_module_seed_phrase();

      if (seeds.includes(seedPhraseToSet) && seeds.includes(seedPhraseToSet2)) {
        console.log("seed phrase found");
      } else {
        fail("seed phrase not found");
      }
      const seedPhraseToSet3 = "obey buffalo exit tide model vast praise enlist concert crazy shove debate";

      threshold_wasm.set_module_seed_phrase("HD Key Tree", seedPhraseToSet3);
      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());

      threshold_wasm.free();
      // tb.storageLayer = MockStorageLayer.fromJSON(storage_after_rust);
      // await tb.syncLocalMetadataTransitions();
      // const returnedSeed2 = await tb.modules.seedPhrase.getSeedPhrases();
      // console.log(returnedSeed2);

      const tkey = new ThresholdKey({
        serviceProvider: customSP,
        manualSync: mode,
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
        modules: {
          seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat]),
          privateKeyModule: new PrivateKeyModule([secp256k1Format, ed25519privateKeyFormat]),
        },
      });
      await tkey.initialize();
      await tkey.inputShareStore(resp1.deviceShare);
      await tkey.reconstructKey(true);
      const returnedSeed2 = await tkey.modules.seedPhrase.getSeedPhrases();
      if (returnedSeed2.length === 3 && returnedSeed2.map((item) => item.seedPhrase).includes(seedPhraseToSet3)) {
        console.log("seed phrase found");
      } else {
        fail("seed phrase not found");
      }
    });

    it.only(`#should be able to get/set private key, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });

      const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
        new BN(
          "7a3118ccdd405b2750271f51cc8fe237d9863584173aec3fa4579d40e5b4951215351c3d54ef416e49567b79c42fd985fcda60a6da9a794e4e844ac8dec47e98",
          "hex"
        ),
      ];
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0]);
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[1]);
      // await tb.modules.privateKeyModule.setPrivateKey("ed25519", actualPrivateKeys[2]);
      await tb.syncLocalMetadataTransitions();
      await tb.modules.privateKeyModule.getAccounts();

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      threshold_wasm.initialize();
      threshold_wasm.import_share_store(JSON.stringify(resp1.deviceShare));
      threshold_wasm.reconstruct_key(true);
      const private_keys = threshold_wasm.get_module_private_keys();
      threshold_wasm.free();

      deepStrictEqual(
        actualPrivateKeys.slice(0, -1).map((x) => x.toString("hex")),
        private_keys
      );
    });

    it.only(`#should be able to get/set private keys and seed phrase, manualSync=${mode}`, async function () {
      // const resp1 = await tb._initializeNewKey({ initializeModules: true });
      const postboxKey = getTempKey();

      const threshold_wasm = createThresholdWasm(postboxKey);
      threshold_wasm.initialize();
      threshold_wasm.reconstruct_key(true);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((x) => x !== "1")[0];
      const deviceShare = threshold_wasm.export_share(deviceIndex);

      const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
      const seedPhraseToSet2 = "chapter gas cost saddle annual mouse chef unknown edit pen stairs claw";
      threshold_wasm.set_module_seed_phrase("HD Key Tree", seedPhraseToSet);
      threshold_wasm.set_module_seed_phrase("HD Key Tree", seedPhraseToSet2);

      const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      ];
      threshold_wasm.set_module_private_key("secp256k1n", actualPrivateKeys[0].toString("hex"));
      threshold_wasm.set_module_private_key("secp256k1n", actualPrivateKeys[1].toString("hex"));

      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());

      const metamaskSeedPhraseFormat2 = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");

      const tb2 = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        manualSync: mode,
        storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
        modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat2]), privateKeyModule: new PrivateKeyModule([secp256k1Format]) },
      });
      await tb2.initialize();
      await tb2.inputShare(deviceShare);
      await tb2.reconstructKey(true);

      const resultSeeedPhrase = await tb2.modules.seedPhrase.getSeedPhrases();
      const resultPrivateKey = await tb2.modules.privateKeyModule.getPrivateKeys();
      if (resultSeeedPhrase.length !== 2) {
        fail("seed phrase set failed");
      }
      if (resultPrivateKey.length !== 2) {
        fail("private key set failed");
      }

      // const reconstructedKey = await tb2.reconstructKey();
      // compareReconstructedKeys(reconstructedKey, {
      //   privKey: resp1.privKey,
      //   seedPhraseModule: [
      //     new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
      //     new BN("4d62a55af3496a7b290a12dd5fd5ef3e051d787dbc005fb74536136949602f9e", "hex"),
      //   ],
      //   privateKeyModule: [
      //     new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
      //     new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      //   ],
      //   allKeys: [
      //     resp1.privKey,
      //     new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
      //     new BN("4d62a55af3496a7b290a12dd5fd5ef3e051d787dbc005fb74536136949602f9e", "hex"),
      //     new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
      //     new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      //   ],
      // });

      // const reconstructedKey2 = await tb2.reconstructKey(false);
      // compareReconstructedKeys(reconstructedKey2, {
      //   privKey: resp1.privKey,
      //   allKeys: [resp1.privKey],
      // });
    });
  });

  describe("Lock", function () {
    it.only(`#locks should fail when tkey/nonce is updated, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({ serviceProvider: customSP, manualSync: mode, storageLayer: customSL });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const deviceIndex = tb.getCurrentShareIndexes().filter((x) => x !== "1");
      const deviceShare = (await tb.outputShare(deviceIndex[0])).toString("hex");
      const storage_after_ts = tb.storageLayer.toJSON();

      // wasm generate new share
      const threshold_wasm = createThresholdWasm(customSP.postboxKey.toString("hex"), storage_after_ts);

      threshold_wasm.initialize();
      threshold_wasm.import_share(deviceShare);
      threshold_wasm.reconstruct_key(false);
      threshold_wasm.generate_new_share();

      const sl_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());
      // check for mock of cloud storage
      tb.storageLayer = MockStorageLayer.fromJSON(sl_after_rust);

      if (resp1.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }

      // Try generate new share from TS
      await rejects(
        async () => {
          await tb.generateNewShare();
          await tb.syncLocalMetadataTransitions();
        },
        (err) => {
          strictEqual(err.code, 1401, "Expected aquireLock failed error is not thrown");
          return true;
        }
      );

      threshold_wasm.free();
    });
  });

  // const TestTKeyInTS = async ( postboxKey:String , storage: String , mode: boolean) => {

  // }

  describe("Stress", function () {
    let tkey;
    beforeEach("Setup Stress Test", async function () {
      const postboxKey = getTempKey();
      tkey = new ThresholdKey({ serviceProvider: newSP(postboxKey), storageLayer: initStorageLayer(), manualSync: mode });
      await tkey._initializeNewKey({ initializeModules: true });
      await tkey.syncLocalMetadataTransitions();
    });
    it.only(`#stress test, manualSync=${mode}`, async function () {
      // reconstruct back in rust
      // generate in rust
      // reconstruct back in ts
      // generate share in ts
      // delete share in ts
      // add share description in ts
      // add module private key in ts
      // add module seed phrase in ts
      // reconsturct in rust
      // check share description in rust
      // check module private key in rust
      // check module seed phrase in rust
      // add share description in rust
      // add module private key in rust
      // add module seed phrase in rust
      // reconstruct in ts
      // check share description in ts
      // check module private key in ts
      // check module seed phrase in ts
      // delete share description in ts
      // delete module private key in ts
      // delete module seed phrase in ts
      // reconstruct in rust
      // check share description in rust
      // check module private key in rust
      // check module seed phrase in rust
      // delete share description in rust
      // delete module private key in rust
      // delete module seed phrase in rust
    });
  });
};
