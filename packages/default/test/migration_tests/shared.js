/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable mocha/no-exports */
/* eslint-disable import/no-extraneous-dependencies */

import { ecCurve, getPubKeyPoint } from "@tkey/common-types";
import PrivateKeyModule, { ED25519Format, SECP256K1Format } from "@tkey/private-keys";
import SecurityQuestionsModule from "@tkey/security-questions";
import SeedPhraseModule, { MetamaskSeedPhraseFormat } from "@tkey/seed-phrase";
import TorusServiceProvider from "@tkey/service-provider-torus";
import ShareTransferModule from "@tkey/share-transfer";
import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";
import { post } from "@toruslabs/http-helpers";
import { deepEqual, deepStrictEqual, equal, fail, notEqual, strict, strictEqual, throws } from "assert";
import BN from "bn.js";
import stringify from "json-stable-stringify";
import { keccak256 } from "web3-utils";

import ThresholdKey from "../../src/index";
import { getMetadataUrl, initStorageLayer, isMocked } from "../helpers";
import {
  create_threshold_key_wasm,
  test_delete_share_wasm,
  test_generate_new_share_wasm,
  test_security_questions_wasm,
  ThresholdKeyMockWasm,
} from "./wasm-nodejs/tkey";

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

export const sharedTestCases = (mode, torusSP, storageLayer) => {
  const customSP = torusSP;
  const customSL = storageLayer;

  const createJsonObj = (tkey) => {
    // const deviceShare = await tkey.outputShare(tkey.getCurrentShareIndexes()[1]);

    let jsonObj = {
      privateKey: tkey.privKey?.toString("hex") || "",
      postboxKey: tkey.serviceProvider.postboxKey.toString("hex"),
      curve_n: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
      // deviceShare: deviceShare.toString("hex"),
    };

    if (mode) {
      // sync transistions pass in storage layer json
      jsonObj = { ...jsonObj, storageLayer: storageLayerJson };
    } else {
      const storageLayerJson = tkey.storageLayer.toJSON();
      jsonObj = { ...jsonObj, storageLayer: storageLayerJson };
    }
    // check for network host or mock storage layer : do not use mode to check
    // jsonObj = { ...jsonObj, host_url: metadataURL , storageLayer: ""};
    return jsonObj;
  };

  describe("tkey rust", function () {
    let tb;
    beforeEach("Setup ThresholdKey", async function () {
      tb = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync: mode });
    });

    it.only("#should be able to create Tkey in TS and reconstruct it in Tkey Rust", async function () {
      const sp = customSP;
      sp.postboxKey = new BN(getTempKey(), "hex");
      const storageLayer = initStorageLayer({ hostUrl: metadataURL });
      const tb2 = new ThresholdKey({ serviceProvider: sp, storageLayer, manualSync: mode });
      await tb2.initialize();
      const reconstructedKey = await tb2.reconstructKey();
      await tb2.syncLocalMetadataTransitions();
      if (tb2.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }

      const deviceShare = await tb2.outputShare(tb2.getCurrentShareIndexes()[1]);
      // let jsonObj = createJsonObj(tb2);
      // jsonObj = { ...jsonObj, deviceShare: deviceShare.toString("hex") };

      const storage_after_ts = tb2.storageLayer.toJSON();

      // wasm reconstruct the key
      const threshold_wasm = new ThresholdKeyMockWasm(customSP.postboxKey.toString("hex"));
      threshold_wasm.storage_layer_from_json(JSON.stringify(storage_after_ts));

      threshold_wasm.initialize();
      threshold_wasm.import_share(deviceShare.toString("hex"));
      threshold_wasm.reconstruct_key(false);

      if (tb2.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      // free memory
      threshold_wasm.free();
    });

    it.only(`#should be able to reconstruct key after TKey created in tkey-rust, manualSync=${mode}`, async function () {
      // wasm initialize key
      const key = getTempKey();
      const threshold_wasm = new ThresholdKeyMockWasm(key);
      threshold_wasm.initialize();
      threshold_wasm.reconstruct_key(false);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);

      // generate new tkey
      // recreate tkey using data from rust
      // const jsonObj = {
      //   postboxKey: getTempKey(),
      //   curve_n: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
      // };
      // const wasmResultJson = await create_threshold_key_wasm(JSON.stringify(jsonObj));

      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());

      const resultSP = customSP;
      resultSP.postboxKey = new BN(key, "hex");
      const result_storageLayer = MockStorageLayer.fromJSON(storage_after_rust);

      const tkey = new ThresholdKey({ serviceProvider: resultSP, storageLayer: result_storageLayer, manualSync: mode });
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

      // let jsonObj = createJsonObj(tb);
      // jsonObj = { ...jsonObj, userShareStore: JSON.stringify(resp1.userShare) };

      const storage_after_ts = tb.storageLayer.toJSON();
      // wasm reconstruct the key
      const threshold_wasm = new ThresholdKeyMockWasm(customSP.postboxKey.toString("hex"));
      threshold_wasm.storage_layer_from_json(JSON.stringify(storage_after_ts));

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
      const key = getTempKey();
      const threshold_wasm = new ThresholdKeyMockWasm(key);
      threshold_wasm.initialize();
      threshold_wasm.reconstruct_key(false);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);

      const storage_after_rust = JSON.parse(threshold_wasm.json_from_storage_layer());
      threshold_wasm.free();

      // reconstruct in TS and generate new share
      const tkey = new ThresholdKey({ serviceProvider: newSP(key), storageLayer: MockStorageLayer.fromJSON(storage_after_rust), manualSync: mode });
      await tkey.initialize();
      await tkey.inputShare(deviceShare);
      await tkey.reconstructKey(true);
      const new_share_result = await tkey.generateNewShare();
      // await tb3.syncLocalMetadataTransitions();
      await tkey.outputShare(new_share_result.newShareIndex.toString("hex"));

      // delete share in rust
      const threshold_wasm_2 = new ThresholdKeyMockWasm(key);
      threshold_wasm_2.storage_layer_from_json(JSON.stringify(tkey.storageLayer.toJSON()));
      threshold_wasm_2.initialize();
      threshold_wasm_2.import_share(deviceShare);
      threshold_wasm_2.reconstruct_key(false);
      threshold_wasm_2.delete_share(new_share_result.newShareIndex.toString("hex"));

      const storage_after_rust_2 = JSON.parse(threshold_wasm_2.json_from_storage_layer());
      threshold_wasm_2.free();

      // reconstruct in TS and delete share
      const tkey_2 = new ThresholdKey({
        serviceProvider: newSP(key),
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
      const threshold_wasm_3 = new ThresholdKeyMockWasm(key);
      threshold_wasm_3.storage_layer_from_json(JSON.stringify(tkey_2.storageLayer.toJSON()));
      threshold_wasm_3.initialize();
      threshold_wasm_3.import_share(deviceShare);
      threshold_wasm_3.reconstruct_key(false);
      const rust_generated_share_index = threshold_wasm_3.generate_new_share(new_share_result.newShareIndex.toString("hex"));
      const storage_after_rust_3 = JSON.parse(threshold_wasm_3.json_from_storage_layer());
      threshold_wasm_3.free();

      // reconsturct in TS
      const tkey_3 = new ThresholdKey({
        serviceProvider: newSP(key),
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

      const threshold_wasm_4 = new ThresholdKeyMockWasm(key);
      try {
        threshold_wasm_4.storage_layer_from_json(JSON.stringify(tkey_3.storageLayer.toJSON()));
        threshold_wasm_4.initialize();
        threshold_wasm_4.import_share(deviceShare);
        threshold_wasm_4.reconstruct_key(false);
        fail("should not be able to create tkey with deleted tkey");
      } catch (e) {}
      threshold_wasm_4.free();
    });

    it(`#should be able to generate and delete share up to 20 shares, manualSync=${mode}`, async function () {
      // long scenario
      // create 2/2 in rust
      const result1 = create_threshold_key_wasm(
        stringify({ postboxKey: getTempKey(), curve_n: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141" })
      );

      const result_after_rust_create = JSON.parse(result1);
      // console.log(result);
      // generate shares in ts
      const result_sp = newSP(new BN(result_after_rust_create.postboxKey, "hex"));
      const result_storageLayer = MockStorageLayer.fromJSON(result_after_rust_create.storageLayer);

      const tb3 = new ThresholdKey({ serviceProvider: result_sp, storageLayer: result_storageLayer, manualSync: mode });
      await tb3.initialize();
      await tb3.inputShare(result_after_rust_create.deviceShare);
      await tb3.reconstructKey(true);

      let tkey = tb3;
      for (let i = 0; i < 1; i++) {
        console.log("loop", i);
        // generate new share in ts
        const new_share_result = await tkey.generateNewShare();
        // await tb3.syncLocalMetadataTransitions();
        const new_share = await tkey.outputShare(new_share_result.newShareIndex.toString("hex"));

        // delete share in rust
        let jsonObj = createJsonObj(tkey);
        jsonObj = { ...jsonObj, deleteShareIndex: new_share_result.newShareIndex.toString("hex") };
        jsonObj = { ...jsonObj, deviceShare: result_after_rust_create.deviceShare };
        jsonObj = { ...jsonObj, deviceShareIndex: result_after_rust_create.deviceShareIndex };

        const result_after_delete = test_delete_share_wasm(stringify(jsonObj));
        const json_after_delete = JSON.parse(result_after_delete);

        const result_sp2 = newSP(new BN(json_after_delete.postboxKey, "hex"));
        const storageLayer_after_delete = MockStorageLayer.fromJSON(json_after_delete.storageLayer);

        const tkey_after_delete = new ThresholdKey({ serviceProvider: result_sp2, storageLayer: storageLayer_after_delete, manualSync: mode });
        await tkey_after_delete.initialize();

        // await tkey_after_delete.inputShare(result_after_rust_create.new_share);
        await tkey_after_delete.inputShare(json_after_delete.deviceShare);

        try {
          await tkey_after_delete.reconstructKey(true);
        } catch (e) {
          fail("should be able to reconstruct key");
        }

        try {
          await tkey_after_delete.outputShare(new_share_result.newShareIndex.toString("hex"));
          fail("should not be able to output share");
        } catch (e) {}

        // generate share in rust
        const result_after_generate = test_generate_new_share_wasm(stringify(json_after_delete));
        const json_after_generate = JSON.parse(result_after_generate);

        const result_sp3 = newSP(new BN(json_after_generate.postboxKey, "hex"));
        const storageLayer_after_generate = MockStorageLayer.fromJSON(json_after_generate.storageLayer);

        const tkey_after_generate = new ThresholdKey({ serviceProvider: result_sp3, storageLayer: storageLayer_after_generate, manualSync: mode });
        await tkey_after_generate.initialize();

        await tkey_after_generate.inputShare(json_after_delete.deviceShare);
        try {
          await tkey_after_generate.reconstructKey(true);
        } catch (e) {
          fail("should be able to reconstruct key");
        }

        // delete share in TS
        // able to delete new share generated from rust
        await tkey_after_generate.deleteShare(json_after_generate.newShareIndex);
        await tkey_after_generate.syncLocalMetadataTransitions();

        let json_after_ts_delete = createJsonObj(tkey_after_generate);
        json_after_ts_delete = { ...json_after_ts_delete, deviceShare: result_after_rust_create.deviceShare };
        json_after_ts_delete = { ...json_after_ts_delete, deviceShareIndex: result_after_rust_create.deviceShareIndex };
        // generate share in rust 2
        const result_after_generate2 = test_generate_new_share_wasm(stringify(json_after_ts_delete));
        const json_after_generate2 = JSON.parse(result_after_generate2);

        const result_after_generate3 = test_generate_new_share_wasm(stringify(json_after_generate2));
        const json_after_generate3 = JSON.parse(result_after_generate3);

        const result_sp4 = newSP(new BN(json_after_generate3.postboxKey, "hex"));
        const storageLayer_after_generate3 = MockStorageLayer.fromJSON(json_after_generate3.storageLayer);

        const tkey_after_generate3 = new ThresholdKey({ serviceProvider: result_sp4, storageLayer: storageLayer_after_generate3, manualSync: mode });
        await tkey_after_generate3.initialize();

        await tkey_after_generate3.inputShare(json_after_delete.deviceShare);
        try {
          await tkey_after_generate3.reconstructKey(true);
        } catch (e) {
          fail("should be able to reconstruct key");
        }
        // tkey = tkey_after_generate;
        tkey = tkey_after_generate3;
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
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await rejects(async function () {
        await tb.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
      }, Error);

      const answer = "blublu";

      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer, "who is your cat?");
      await tb.syncLocalMetadataTransitions();
      const question = tb.modules.securityQuestions.getSecurityQuestions();
      strictEqual(question, "who is your cat?");

      const jsonObj = createJsonObj(tb);

      const action = "check";
      const jsonObj_wrong = { ...jsonObj, securityQuestions: { answer: "blublu-wrong", question, action } };
      const jsonObj_correct = { ...jsonObj, securityQuestions: { answer, question, action } };

      try {
        await test_security_questions_wasm(stringify(jsonObj_wrong));
        fail("should not be able to reconstruct key");
      } catch (e) {}
      const result = await test_security_questions_wasm(stringify(jsonObj_correct));

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
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer1, "who is your cat?");
      await tb.generateNewShare();
      await tb.syncLocalMetadataTransitions();

      // delete sq
      const sqIndex = tb.metadata.generalStore.securityQuestions.shareIndex;
      await tb.deleteShare(sqIndex);

      const jsonObjShareDeleted = createJsonObj(tb);

      const action = "check";
      const jsonObjShareDeleted1 = { ...jsonObjShareDeleted, securityQuestions: { answer: answer1, question } };
      const jsonObjShareDeleted2 = { ...jsonObjShareDeleted, securityQuestions: { answer: answer2, question } };

      try {
        await test_security_questions_wasm(stringify(jsonObjShareDeleted1));
        fail("should not be able to reconstruct key when share is deleted");
      } catch (e) {}
      try {
        await test_security_questions_wasm(stringify(jsonObjShareDeleted2));
        fail("should not be able to reconstruct key when share is deleted");
      } catch (e) {}

      // add sq again
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer2, "who is your cat?");
      await tb.syncLocalMetadataTransitions();

      const jsonObj = createJsonObj(tb);

      const jsonObj1 = { ...jsonObj, securityQuestions: { answer: answer1, question, action } };
      const jsonObj2 = { ...jsonObj, securityQuestions: { answer: answer2, question, action } };

      try {
        await test_security_questions_wasm(stringify(jsonObj1));
        fail("should not be able to reconstruct key with wrong answer");
      } catch (e) {}
      await test_security_questions_wasm(stringify(jsonObj2));
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
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      // await tb.syncLocalMetadataTransitions();

      const deviceIndex = (await tb.getCurrentShareIndexes()).filter((x) => x !== "1")[0];
      const deviceShare = await tb.outputShare(deviceIndex);

      let jsonObj = createJsonObj(tb);
      jsonObj = { ...jsonObj, deviceShare };

      const threshold = new ThresholdKeyMockWasm(customSP.postboxKey.toString("hex"));
      threshold.storage_layer_from_json(JSON.stringify(jsonObj.storageLayer));
      threshold.initialize();

      const encPubX = threshold.request_share_transfer("agent", []);

      const sl_after_rust = threshold.json_from_storage_layer();
      tb.storageLayer = MockStorageLayer.fromJSON(JSON.parse(sl_after_rust));

      const req = await tb.modules.shareTransfer.lookForRequests();
      const newShare = await tb.generateNewShare();
      await tb.modules.shareTransfer.approveRequestWithShareIndex(req[0], newShare.newShareIndex.toString("hex"));

      const sl_after_ts2 = tb.storageLayer.toJSON();
      threshold.storage_layer_from_json(JSON.stringify(sl_after_ts2));
      threshold.request_status_check_approval(encPubX);

      threshold.reconstruct_key(false);

      threshold.free();
    });

    it.only(`#should be able to transfer share via the module request from rust, manualSync=${mode}`, async function () {
      const threshold = new ThresholdKeyMockWasm(customSP.postboxKey.toString("hex"));
      threshold.initialize();
      threshold.reconstruct_key(false);

      const sl_after_rust = MockStorageLayer.fromJSON(JSON.parse(threshold.json_from_storage_layer()));
      const tkey = new ThresholdKey({ serviceProvider: customSP, storageLayer: sl_after_rust, manualSync: mode });
      await tkey.initialize();
      const encPubX_ts = await tkey.modules.shareTransfer.requestNewShare("Tkey From TS", []);
      const sl_after_ts = tkey.storageLayer.toJSON();

      threshold.storage_layer_from_json(JSON.stringify(sl_after_ts));
      const encPubX = threshold.look_for_request();
      const newShareIndex = threshold.generate_new_share();
      threshold.approve_request_with_share_index(encPubX[0], newShareIndex);

      const sl_after_rust2 = threshold.json_from_storage_layer();
      tkey.storageLayer = MockStorageLayer.fromJSON(JSON.parse(sl_after_rust2));
      await tkey.modules.shareTransfer.startRequestStatusCheck(encPubX_ts, true);

      tkey.reconstructKey(false);
      threshold.free();
    });

    it(`#should be able to transfer device share, manualSync=${mode}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: customSP,
        manualSync: mode,
        storageLayer: customSL,
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

      // await new Promise((res) => {
      //   setTimeout(res, 1001);
      // });

      const reconstructedKey = await tb2.reconstructKey();
      if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
        fail("key should be able to be reconstructed");
      }
    });
    it(`#should be able to delete share transfer from another device, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const tb2 = new ThresholdKey({
        serviceProvider: customSP,
        manualSync: mode,
        storageLayer: customSL,
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
      await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      await tb.modules.shareTransfer.resetShareTransferStore();
      const newRequests = await tb.modules.shareTransfer.getShareTransferStore();
      if (Object.keys(newRequests).length !== 0) {
        fail("Unable to reset share store");
      }
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

      // const metamaskSeedPhraseFormat2 = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
      // const tb2 = new ThresholdKey({
      //   serviceProvider: customSP,
      //   manualSync: mode,
      //   storageLayer: customSL,
      //   modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat2]) },
      // });
      // await tb2.initialize();
      // tb2.inputShareStore(resp1.deviceShare);
      // const reconstuctedKey = await tb2.reconstructKey();

      const deviceIndex = tb.getCurrentShareIndexes().filter((index) => index !== 0)[0];
      const deviceShare = tb.outputShare(deviceIndex);
      let jsonObj = createJsonObj(tb);
      jsonObj = { ...jsonObj, deviceShare };

      // get seedphrase

      await tb.modules.seedPhrase.getSeedPhrasesWithAccounts();

      // compareReconstructedKeys(reconstuctedKey, {
      //   privKey: resp1.privKey,
      //   seedPhraseModule: [
      //     new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
      //     new BN("bfdb025a1d404212c3f9ace6c5fb4185087281dcb9c1e89087d1a3a423f80d22", "hex"),
      //   ],
      //   allKeys: [
      //     resp1.privKey,
      //     new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex"),
      //     new BN("bfdb025a1d404212c3f9ace6c5fb4185087281dcb9c1e89087d1a3a423f80d22", "hex"),
      //   ],
      // });
    });
    // it(`#should be able to derive keys, manualSync=${mode}`, async function () {
    //   const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
    //   await tb._initializeNewKey({ initializeModules: true });
    //   await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet);
    //   await tb.syncLocalMetadataTransitions();

    //   const actualPrivateKeys = [new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex")];
    //   const derivedKeys = await tb.modules.seedPhrase.getAccounts();
    //   compareBNArray(actualPrivateKeys, derivedKeys, "key should be same");
    // });

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
        new BN(
          "7a3118ccdd405b2750271f51cc8fe237d9863584173aec3fa4579d40e5b4951215351c3d54ef416e49567b79c42fd985fcda60a6da9a794e4e844ac8dec47e98",
          "hex"
        ),
      ];
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0]);
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[1]);
      await tb.modules.privateKeyModule.setPrivateKey("ed25519", actualPrivateKeys[2]);
      await tb.syncLocalMetadataTransitions();
      await tb.modules.privateKeyModule.getAccounts();

      const getAccounts = await tb.modules.privateKeyModule.getAccounts();
      deepStrictEqual(
        actualPrivateKeys.map((x) => x.toString("hex")),
        getAccounts.map((x) => x.toString("hex"))
      );
    });

    it(`#should be able to get/set private key, manualSync=${mode}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });

      const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
        new BN(
          "99da9559e15e913ee9ab2e53e3dfad575da33b49be1125bb922e33494f4988281b2f49096e3e5dbd0fcfa9c0c0cd92d9ab3b21544b34d5dd4a65d98b878b9922",
          "hex"
        ),
      ];

      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0]);
      await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[1]);
      await tb.modules.privateKeyModule.setPrivateKey("ed25519", actualPrivateKeys[2]);
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
      await tb.modules.privateKeyModule.setPrivateKey("ed25519");
      await tb.syncLocalMetadataTransitions();

      const accounts = await tb.modules.privateKeyModule.getAccounts();
      strictEqual(accounts.length, 3);
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
        serviceProvider: customSP,
        manualSync: mode,
        storageLayer: customSL,
        modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat2]), privateKeyModule: new PrivateKeyModule([secp256k1Format]) },
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
    it.only(`#locks should fail when tkey/nonce is updated, manualSync=${mode}`, async function () {
      const tb = new ThresholdKey({ serviceProvider: customSP, manualSync: mode, storageLayer: customSL });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      await tb.syncLocalMetadataTransitions();

      const deviceIndex = tb.getCurrentShareIndexes().filter((x) => x !== "1");
      const deviceShare = (await tb.outputShare(deviceIndex[0])).toString("hex");
      const sl_after_ts = tb.storageLayer.toJSON();

      // wasm generate new share
      const threshold_wasm = new ThresholdKeyMockWasm(customSP.postboxKey.toString("hex"));
      threshold_wasm.storage_layer_from_json(JSON.stringify(sl_after_ts));

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

  describe("OneKey", function () {
    if (!mode || isMocked) return;

    it("should be able to init tkey with 1 out of 1", async function () {
      const postboxKeyBN = new BN(generatePrivate(), "hex");
      const pubKeyPoint = getPubKeyPoint(postboxKeyBN);

      const serviceProvider = new TorusServiceProvider({
        postboxKey: postboxKeyBN.toString("hex"),
        customAuthArgs: {
          enableOneKey: true,
          metadataUrl: getMetadataUrl(),
          // This url has no effect as postbox key is passed, passing it just to satisfy direct auth checks.
          baseUrl: "http://localhost:3000",
        },
      });
      const storageLayer2 = new TorusStorageLayer({ hostUrl: getMetadataUrl() });

      const { typeOfUser, nonce, pubNonce } = await serviceProvider.directWeb.torus.getOrSetNonce(
        pubKeyPoint.x.toString("hex"),
        pubKeyPoint.y.toString("hex"),
        postboxKeyBN
      );
      equal(typeOfUser, "v2");
      notEqual(nonce, undefined);
      notEqual(pubNonce, undefined);

      const nonceBN = new BN(nonce, "hex");
      const importKey = postboxKeyBN.add(nonceBN).umod(serviceProvider.directWeb.torus.ec.curve.n).toString("hex");

      const tKey = new ThresholdKey({ serviceProvider, storageLayer: storageLayer2, manualSync: mode });
      await tKey.initialize({
        importKey: new BN(importKey, "hex"),
        delete1OutOf1: true,
      });
      await tKey.syncLocalMetadataTransitions();
      equal(tKey.privKey.toString("hex"), importKey);

      const {
        typeOfUser: newTypeOfUser,
        nonce: newNonce,
        pubNonce: newPubNonce,
        upgraded,
      } = await serviceProvider.directWeb.torus.getOrSetNonce(pubKeyPoint.x.toString("hex"), pubKeyPoint.y.toString("hex"), postboxKeyBN);
      equal(upgraded, true);
      equal(newTypeOfUser, "v2");
      equal(newNonce, undefined);
      deepEqual(pubNonce, newPubNonce);
    });

    it("should not change v1 address without a custom nonce when getOrSetNonce is called", async function () {
      // Create an existing v1 account
      const postboxKeyBN = new BN(generatePrivate(), "hex");
      const pubKeyPoint = getPubKeyPoint(postboxKeyBN);

      // This test require development API, only work with local/beta env
      let metadataUrl = getMetadataUrl();
      if (metadataUrl === "https://metadata.tor.us") metadataUrl = "https://metadata-testing.tor.us";
      await post(
        `${metadataUrl}/set_nonce`,
        {
          pub_key_X: pubKeyPoint.x.toString("hex"),
          pub_key_Y: pubKeyPoint.y.toString("hex"),
        },
        undefined,
        { useAPIKey: true }
      );

      // Call get or set nonce
      const serviceProvider = new TorusServiceProvider({
        postboxKey: postboxKeyBN.toString("hex"),
        customAuthArgs: {
          enableOneKey: true,
          metadataUrl,
          // This url has no effect as postbox key is passed, passing it just to satisfy direct auth checks.
          baseUrl: "http://localhost:3000",
        },
      });

      const res = await serviceProvider.directWeb.torus.getOrSetNonce(pubKeyPoint.x.toString("hex"), pubKeyPoint.y.toString("hex"), postboxKeyBN);
      equal(res.typeOfUser, "v1");

      const anotherRes = await serviceProvider.directWeb.torus.getOrSetNonce(
        pubKeyPoint.x.toString("hex"),
        pubKeyPoint.y.toString("hex"),
        postboxKeyBN
      );
      deepEqual(res, anotherRes);
    });

    it("should not change v1 address with a custom nonce when getOrSetNonce is called", async function () {
      // Create an existing v1 account with custom key
      const postboxKeyBN = new BN(generatePrivate(), "hex");
      const pubKeyPoint = getPubKeyPoint(postboxKeyBN);
      const customKey = generatePrivate().toString("hex");

      const serviceProvider = new TorusServiceProvider({
        postboxKey: postboxKeyBN.toString("hex"),
        customAuthArgs: {
          enableOneKey: true,
          metadataUrl: getMetadataUrl(),
          // This url has no effect as postbox key is passed, passing it just to satisfy direct auth checks.
          baseUrl: "http://localhost:3000",
        },
      });
      await serviceProvider.directWeb.torus.setCustomKey({ torusKeyHex: postboxKeyBN.toString("hex"), customKeyHex: customKey.toString("hex") });

      // Compare nonce returned from v1 API and v2 API
      const getMetadataNonce = await serviceProvider.directWeb.torus.getMetadata({
        pub_key_X: pubKeyPoint.x.toString("hex"),
        pub_key_Y: pubKeyPoint.y.toString("hex"),
      });
      const getOrSetNonce = await serviceProvider.directWeb.torus.getOrSetNonce(
        pubKeyPoint.x.toString("hex"),
        pubKeyPoint.y.toString("hex"),
        postboxKeyBN
      );
      equal(getOrSetNonce.typeOfUser, "v1");
      equal(getOrSetNonce.nonce, getMetadataNonce.toString("hex"));
    });
  });
};
