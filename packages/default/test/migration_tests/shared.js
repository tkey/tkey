/* eslint-disable no-console */
/* eslint-disable camelcase */

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
import { deepStrictEqual, equal, fail, strictEqual, throws } from "assert";
import BN from "bn.js";
import { randomInt } from "crypto";
import { keccak256 } from "web3-utils";

import ThresholdKey from "../../src/index";
import { getMetadataUrl, initStorageLayer, isMocked } from "../helpers";
import { ThresholdKeyMockWasm, ThresholdKeyWasm } from "./wasm-nodejs/tkey";

const newSP = (privateKey) => {
  return new TorusServiceProvider({
    postboxKey: privateKey,
    customAuthArgs: {
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

function getTempKey() {
  return generatePrivate().toString("hex");
}

export const sharedTestCases = (manualSync, torusSP) => {
  const customSP = torusSP;
  const customSL = initStorageLayer({ hostUrl: getMetadataUrl() });

  const createThresholdWasm = (postboxKey, storage) => {
    const curve_n = "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141";
    if (isMocked) {
      const threshold_wasm = new ThresholdKeyMockWasm(postboxKey, manualSync, curve_n);
      // update storage if provided ( initialize key if storage not provided)
      if (storage) threshold_wasm.storage_layer_from_json(JSON.stringify(storage));
      return threshold_wasm;
    }
    // else return cloud storage Threshold
    return new ThresholdKeyWasm(postboxKey, manualSync, curve_n);
    // return new ThresholdKeyMockWasm(postboxKey);
  };

  const createThresholdTS = (postboxKey, storage) => {
    const metadataURL = getMetadataUrl();
    const tkey = new ThresholdKey({
      serviceProvider: newSP(postboxKey),
      storageLayer: initStorageLayer({ hostUrl: metadataURL, storage }),
      manualSync,
    });
    return tkey;
  };

  describe("tkey rust", function () {
    let tb;
    beforeEach("Setup ThresholdKey", async function () {
      tb = new ThresholdKey({ serviceProvider: customSP, storageLayer: customSL, manualSync });
    });

    it("#should be able to create Tkey in TS and reconstruct it in Tkey Rust", async function () {
      const postboxKey = getTempKey();
      const tkey = createThresholdTS(postboxKey);
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

      await threshold_wasm.initialize();
      await threshold_wasm.import_share(deviceShare.toString("hex"));
      await threshold_wasm.reconstruct_key(false);

      if (tkey.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      // free memory
      threshold_wasm.free();
    });

    it(`#should be able to reconstruct key after TKey created in tkey-rust, manualSync=${manualSync}`, async function () {
      // wasm initialize key
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      await threshold_wasm.initialize();
      await threshold_wasm.reconstruct_key(false);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);

      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();
      let storage_after_rust;
      if (isMocked) storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());

      const tkey = createThresholdTS(postboxKey, storage_after_rust);
      //   new ThresholdKey({
      //   serviceProvider: newSP(postboxKey),
      //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
      //   manualSync,
      // });
      await tkey.initialize();
      console.log("tkey ts initialized");
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

    it(`#should be able to reconstruct key when initializing with user input in TS and reconstruct in Tkey Rust, manualSync=${manualSync}`, async function () {
      let determinedShare = new BN(keccak256("user answer blublu").slice(2), "hex");
      determinedShare = determinedShare.umod(ecCurve.curve.n);
      const resp1 = await tb._initializeNewKey({ determinedShare, initializeModules: true });
      await tb.reconstructKey();
      await tb.syncLocalMetadataTransitions();

      const storage_after_ts = tb.storageLayer.toJSON();
      // wasm reconstruct the key
      const threshold_wasm = createThresholdWasm(customSP.postboxKey.toString("hex"), storage_after_ts);

      await threshold_wasm.initialize();
      threshold_wasm.import_share_store(JSON.stringify(resp1.userShare));
      await threshold_wasm.reconstruct_key(false);

      if (resp1.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      // free memory
      threshold_wasm.free();
    });

    it(`#should be able to generate and delete share and delete Tkey, manualSync=${manualSync}`, async function () {
      // long scenario
      // create 2/2 in rust
      // wasm initialize key
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      await threshold_wasm.initialize();
      await threshold_wasm.reconstruct_key(false);

      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);

      let storage_after_rust;
      if (isMocked) storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());
      threshold_wasm.free();

      // reconstruct in TS and generate new share
      const tkey = createThresholdTS(postboxKey, storage_after_rust);
      //   new ThresholdKey({
      //   serviceProvider: newSP(postboxKey),
      //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
      //   manualSync,
      // });
      await tkey.initialize();
      await tkey.inputShare(deviceShare);
      await tkey.reconstructKey(true);
      const new_share_result = await tkey.generateNewShare();
      // manual sync
      if (manualSync) await tkey.syncLocalMetadataTransitions();
      await tkey.outputShare(new_share_result.newShareIndex.toString("hex"));

      // delete share in rust
      const threshold_wasm_2 = createThresholdWasm(postboxKey, isMocked ? undefined : tkey.storageLayer.toJSON());

      await threshold_wasm_2.initialize();
      await threshold_wasm_2.import_share(deviceShare);
      await threshold_wasm_2.reconstruct_key(false);
      await threshold_wasm_2.delete_share(new_share_result.newShareIndex.toString("hex"));

      if (manualSync) threshold_wasm_2.sync_local_metadata_transitions();
      let storage_after_rust_2;
      if (isMocked) storage_after_rust_2 = JSON.parse(threshold_wasm_2.storage_layer_to_json());
      threshold_wasm_2.free();

      // reconstruct in TS and delete share
      const tkey_2 = createThresholdTS(postboxKey, storage_after_rust_2);
      // new ThresholdKey({
      //   serviceProvider: newSP(postboxKey),
      //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust_2),
      //   manualSync,
      // });
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
      const threshold_wasm_3 = createThresholdWasm(postboxKey, isMocked ? undefined : tkey_2.storageLayer.toJSON());
      await threshold_wasm_3.initialize();
      await threshold_wasm_3.import_share(deviceShare);
      await threshold_wasm_3.reconstruct_key(false);
      const rust_generated_share_index = await threshold_wasm_3.generate_new_share(new_share_result.newShareIndex.toString("hex"));

      if (manualSync) await threshold_wasm_3.sync_local_metadata_transitions();
      let storage_after_rust_3;
      if (isMocked) storage_after_rust_3 = JSON.parse(threshold_wasm_3.storage_layer_to_json());
      threshold_wasm_3.free();

      // reconsturct in TS
      const tkey_3 = createThresholdTS(postboxKey, storage_after_rust_3);
      //   new ThresholdKey({
      //   serviceProvider: newSP(postboxKey),
      //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust_3),
      //   manualSync,
      // });
      await tkey_3.initialize();

      await tkey_3.inputShare(deviceShare);
      try {
        await tkey_3.reconstructKey(true);
      } catch (e) {
        fail("should be able to reconstruct key");
      }
      // able to delete new share generated from rust
      await tkey_3.deleteShare(rust_generated_share_index);
      if (manualSync) await tkey_3.syncLocalMetadataTransitions();

      // delete tkey in ts
      await tkey_3.CRITICAL_deleteTkey();

      const threshold_wasm_4 = createThresholdWasm(postboxKey, tkey_3.storageLayer.toJSON());
      try {
        await threshold_wasm_4.initialize();
        await threshold_wasm_4.import_share(deviceShare);
        await threshold_wasm_4.reconstruct_key(false);
        fail("should not be able to create tkey with deleted tkey");
      } catch (e) {}
      threshold_wasm_4.free();
    });

    it(`#should be able to generate and delete share up to 20 shares, manualSync=${manualSync}`, async function () {
      // long scenario
      // create 2/2 in rust
      // wasm initialize key
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      await threshold_wasm.initialize();
      await threshold_wasm.reconstruct_key(false);
      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((el) => el !== "1");
      const deviceShare = threshold_wasm.export_share(deviceIndex[0]);
      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();
      let storage_after_rust;
      if (isMocked) storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());
      threshold_wasm.free();

      // reconstruct in ts
      const tb3 = createThresholdTS(postboxKey, storage_after_rust);
      //   new ThresholdKey({
      //   serviceProvider: newSP(postboxKey),
      //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust),
      //   manualSync,
      // });
      await tb3.initialize();
      await tb3.inputShare(deviceShare);
      await tb3.reconstructKey(true);

      let tkey = tb3;
      for (let i = 0; i < 1; i++) {
        console.log("loop", i);
        // generate new share in ts
        const new_share_result = await tkey.generateNewShare();
        if (manualSync) await tkey.syncLocalMetadataTransitions();
        await tkey.outputShare(new_share_result.newShareIndex.toString("hex"));

        // delete share in rust
        const threshold_wasm_2 = createThresholdWasm(postboxKey, tkey.storageLayer.toJSON());
        await threshold_wasm_2.initialize();
        await threshold_wasm_2.import_share(deviceShare);
        await threshold_wasm_2.reconstruct_key(true);
        await threshold_wasm_2.delete_share(new_share_result.newShareIndex.toString("hex"));
        if (manualSync) await threshold_wasm_2.sync_local_metadata_transitions();
        let storage_after_rust_2;
        if (isMocked) storage_after_rust_2 = JSON.parse(threshold_wasm_2.storage_layer_to_json());
        threshold_wasm_2.free();

        // reconstruct in ts
        const tkey_2 = createThresholdTS(postboxKey, storage_after_rust_2);
        //   new ThresholdKey({
        //   serviceProvider: newSP(postboxKey),
        //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust_2),
        //   manualSync,
        // });
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

        const threshold_wasm_3 = createThresholdWasm(postboxKey, isMocked ? undefined : tkey_2.storageLayer.toJSON());
        await threshold_wasm_3.initialize();
        await threshold_wasm_3.import_share(deviceShare);
        await threshold_wasm_3.reconstruct_key(false);
        const newShareIndexWasm = await threshold_wasm_3.generate_new_share();
        if (manualSync) await threshold_wasm_3.sync_local_metadata_transitions();
        let storage_after_rust_3;
        if (isMocked) storage_after_rust_3 = JSON.parse(threshold_wasm_3.storage_layer_to_json());
        threshold_wasm_3.free();
        console.log("generate share wasm");

        const tkey_3 = createThresholdTS(postboxKey, storage_after_rust_3);
        //   new ThresholdKey({
        //   serviceProvider: newSP(postboxKey),
        //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust_3),
        //   manualSync,
        // });
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
        if (manualSync) await tkey_3.syncLocalMetadataTransitions();

        const threshold_wasm_4 = createThresholdWasm(postboxKey, isMocked ? undefined : tkey_3.storageLayer.toJSON());
        await threshold_wasm_4.initialize();
        await threshold_wasm_4.import_share(deviceShare);
        await threshold_wasm_4.reconstruct_key(false);

        await threshold_wasm_4.generate_new_share();
        await threshold_wasm_4.generate_new_share();

        if (manualSync) await threshold_wasm_4.sync_local_metadata_transitions();
        let storage_after_rust_4;
        if (isMocked) storage_after_rust_4 = JSON.parse(threshold_wasm_4.storage_layer_to_json());
        threshold_wasm_4.free();

        const tkey_4 = createThresholdTS(postboxKey, storage_after_rust_4);
        //   new ThresholdKey({
        //   serviceProvider: newSP(postboxKey),
        //   storageLayer: MockStorageLayer.fromJSON(storage_after_rust_4),
        //   manualSync,
        // });
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
        manualSync,
      });
    });
    // security question do not have effect on manual sync
    it(`#should be able to reconstruct key and initialize a key with security questions, manualSync=${manualSync}`, async function () {
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

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), isMocked ? undefined : tb.storageLayer.toJSON());
      await threshold_wasm.initialize();
      try {
        await threshold_wasm.input_share_from_security_questions("blublu-wrong");
        // await test_security_questions_wasm(stringify(jsonObj_wrong));
        fail("should not be able to reconstruct key");
      } catch (e) {}
      await threshold_wasm.input_share_from_security_questions(answer);
      await threshold_wasm.reconstruct_key(true);
      threshold_wasm.free();
      // const result = await test_security_questions_wasm(stringify(jsonObj_correct));

      // console.log(result);
      // if (resp1.privKey.cmp(result.privKey) !== 0) {
      //   fail("key should be able to be reconstructed");
      // }
    });
    it(`#should be able to delete and add security questions, manualSync=${manualSync}`, async function () {
      const resp1 = await tb._initializeNewKey({ initializeModules: true });

      const answer1 = "blublu";
      const answer2 = "blubluss";
      const question = "who is your cat?";
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer1, question);
      await tb.generateNewShare();

      // delete sq
      const sqIndex = tb.metadata.generalStore.securityQuestions.shareIndex;
      await tb.deleteShare(sqIndex);

      if (manualSync) await tb.syncLocalMetadataTransitions();

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      await threshold_wasm.initialize();
      try {
        await threshold_wasm.input_share_from_security_questions(answer1);
        fail("should not be able to reconstruct key when share is deleted");
      } catch (e) {}
      try {
        await threshold_wasm.input_share_from_security_questions(answer2);
        fail("should not be able to reconstruct key when share is deleted");
      } catch (e) {}

      threshold_wasm.free();

      // add sq again
      await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions(answer2, "who is your cat?");
      await tb.syncLocalMetadataTransitions();

      const threshold_wasm_2 = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      await threshold_wasm_2.initialize();

      try {
        await threshold_wasm_2.input_share_from_security_questions(answer1);
        fail("should not be able to reconstruct key with wrong answer");
      } catch (e) {}
      await threshold_wasm_2.input_share_from_security_questions(answer2);

      await threshold_wasm_2.reconstruct_key();
      if (resp1.privKey.toString("hex") !== threshold_wasm_2.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }
      threshold_wasm_2.free();
    });

    it.skip(`#should be able to reconstruct key and initialize a key with security questions after refresh, manualSync=${manualSync}`, async function () {
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
    it.skip(`#should be able to change password, manualSync=${manualSync}`, async function () {
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
    it.skip(`#should be able to change password and serialize, manualSync=${manualSync}`, async function () {
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
    it.skip(`#should be able to get answers, even when they change, manualSync=${manualSync}`, async function () {
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
        manualSync,
        storageLayer: customSL,
        modules: { shareTransfer: new ShareTransferModule() },
      });
    });
    it.only(`#should be able to transfer share via the module request from TS to rust, manualSync=${manualSync}`, async function () {
      await tb._initializeNewKey({ initializeModules: true });
      if (manualSync) await tb.syncLocalMetadataTransitions();

      const threshold_wasm = createThresholdWasm(customSP.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      await threshold_wasm.initialize();

      const encPubX = await threshold_wasm.request_share_transfer("agent", []);

      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();
      if (isMocked) {
        const storage_after_rust = threshold_wasm.storage_layer_to_json();
        // eslint-disable-next-line require-atomic-updates
        tb.storageLayer = MockStorageLayer.fromJSON(JSON.parse(storage_after_rust));
      }

      const req = await tb.modules.shareTransfer.lookForRequests();
      const newShare = await tb.generateNewShare();
      await tb.modules.shareTransfer.approveRequestWithShareIndex(req[0], newShare.newShareIndex.toString("hex"));

      if (manualSync) await tb.syncLocalMetadataTransitions();
      if (isMocked) await threshold_wasm.storage_layer_from_json(JSON.stringify(tb.storageLayer.toJSON()));
      await threshold_wasm.request_status_check_approval(encPubX);

      await threshold_wasm.reconstruct_key(false);

      equal(tb.privKey.toString("hex"), threshold_wasm.get_priv_key(), "key should be able to be reconstructed");
      threshold_wasm.free();
    });

    it(`#should be able to transfer share via the module request from rust to TS, manualSync=${manualSync}`, async function () {
      const postboxKey = getTempKey();
      const threshold_wasm = createThresholdWasm(postboxKey);
      await threshold_wasm.initialize();
      await threshold_wasm.reconstruct_key(false);
      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();

      let storage_after_rust;
      if (isMocked) storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());
      const tkey = createThresholdTS(postboxKey, storage_after_rust);
      // });
      await tkey.initialize();
      const encPubX_ts = await tkey.modules.shareTransfer.requestNewShare("Tkey From TS", []);
      if (manualSync) await tkey.syncLocalMetadataTransitions();

      if (isMocked) {
        const storage_after_ts = tkey.storageLayer.toJSON();
        threshold_wasm.storage_layer_from_json(JSON.stringify(storage_after_ts));
      }

      const encPubX = await threshold_wasm.look_for_request();
      const encPubXArr = JSON.parse(encPubX);
      const newShareIndex = await threshold_wasm.generate_new_share();
      await threshold_wasm.approve_request_with_share_index(encPubXArr[0], newShareIndex);
      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();

      if (isMocked) {
        const storage_after_rust_2 = threshold_wasm.storage_layer_to_json();
        tkey.storageLayer = MockStorageLayer.fromJSON(JSON.parse(storage_after_rust_2));
      }
      await tkey.modules.shareTransfer.startRequestStatusCheck(encPubX_ts, true);

      await tkey.reconstructKey(false);

      equal(tkey.privKey.toString("hex"), threshold_wasm.get_priv_key(), "key should be able to be reconstructed");
      threshold_wasm.free();
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
        manualSync,
        storageLayer: customSL,
        modules: {
          seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat]),
          privateKeyModule: new PrivateKeyModule([secp256k1Format, ed25519privateKeyFormat]),
        },
      });
    });

    it(`#should get/set multiple seed phrase, manualSync=${manualSync}`, async function () {
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
      await threshold_wasm.initialize();

      try {
        await threshold_wasm.get_module_private_keys();
        fail("should not be able to get private keys");
      } catch (e) {
        // pass
      }

      await threshold_wasm.import_share_store(JSON.stringify(resp1.deviceShare));
      await threshold_wasm.reconstruct_key(true);
      const seeds = await threshold_wasm.get_module_seed_phrase();

      if (seeds.includes(seedPhraseToSet) && seeds.includes(seedPhraseToSet2)) {
        console.log("seed phrase found");
      } else {
        fail("seed phrase not found");
      }
      const seedPhraseToSet3 = "obey buffalo exit tide model vast praise enlist concert crazy shove debate";

      await threshold_wasm.set_module_seed_phrase("HD Key Tree", seedPhraseToSet3);

      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();
      let storage_after_rust;
      if (isMocked) storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());

      threshold_wasm.free();
      // tb.storageLayer = MockStorageLayer.fromJSON(storage_after_rust);
      // await tb.syncLocalMetadataTransitions();
      // const returnedSeed2 = await tb.modules.seedPhrase.getSeedPhrases();
      // console.log(returnedSeed2);

      const tkey = new ThresholdKey({
        serviceProvider: customSP,
        manualSync,
        storageLayer: initStorageLayer({ hostUrl: getMetadataUrl(), storage: storage_after_rust }),
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

    it(`#should be able to get/set private key, manualSync=${manualSync}`, async function () {
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
      if (manualSync) await tb.syncLocalMetadataTransitions();
      await tb.modules.privateKeyModule.getAccounts();

      const threshold_wasm = createThresholdWasm(tb.serviceProvider.postboxKey.toString("hex"), tb.storageLayer.toJSON());
      await threshold_wasm.initialize();
      await threshold_wasm.import_share_store(JSON.stringify(resp1.deviceShare));
      await threshold_wasm.reconstruct_key(true);
      const private_keys = await threshold_wasm.get_module_private_keys();
      threshold_wasm.free();

      deepStrictEqual(
        actualPrivateKeys.slice(0, -1).map((x) => x.toString("hex")),
        private_keys
      );
    });

    it(`#should be able to get/set private keys and seed phrase, manualSync=${manualSync}`, async function () {
      // const resp1 = await tb._initializeNewKey({ initializeModules: true });
      const postboxKey = getTempKey();

      const threshold_wasm = createThresholdWasm(postboxKey);
      await threshold_wasm.initialize();
      await threshold_wasm.reconstruct_key(true);

      const deviceIndex = threshold_wasm.get_current_share_indexes().filter((x) => x !== "1")[0];
      const deviceShare = threshold_wasm.export_share(deviceIndex);

      const seedPhraseToSet = "seed sock milk update focus rotate barely fade car face mechanic mercy";
      const seedPhraseToSet2 = "chapter gas cost saddle annual mouse chef unknown edit pen stairs claw";
      await threshold_wasm.set_module_seed_phrase("HD Key Tree", seedPhraseToSet);
      await threshold_wasm.set_module_seed_phrase("HD Key Tree", seedPhraseToSet2);

      const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      ];
      await threshold_wasm.set_module_private_key("secp256k1n", actualPrivateKeys[0].toString("hex"));
      await threshold_wasm.set_module_private_key("secp256k1n", actualPrivateKeys[1].toString("hex"));

      if (manualSync) await threshold_wasm.sync_local_metadata_transitions();
      let storage_after_rust;
      if (isMocked) storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());

      const metamaskSeedPhraseFormat2 = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");

      const tb2 = new ThresholdKey({
        serviceProvider: newSP(postboxKey),
        manualSync,
        storageLayer: initStorageLayer({ hostUrl: getMetadataUrl(), storage: storage_after_rust }),
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
    it.only(`#locks should fail when tkey/nonce is updated, manualSync=${manualSync}`, async function () {
      const tb = new ThresholdKey({ serviceProvider: customSP, manualSync, storageLayer: customSL });
      const resp1 = await tb._initializeNewKey({ initializeModules: true });
      if (manualSync) await tb.syncLocalMetadataTransitions();

      const deviceIndex = tb.getCurrentShareIndexes().filter((x) => x !== "1");
      const deviceShare = (await tb.outputShare(deviceIndex[0])).toString("hex");
      const storage_after_ts = tb.storageLayer.toJSON();

      // wasm generate new share
      const threshold_wasm = createThresholdWasm(customSP.postboxKey.toString("hex"), storage_after_ts);

      await threshold_wasm.initialize();
      await threshold_wasm.import_share(deviceShare);
      await threshold_wasm.reconstruct_key(false);
      await threshold_wasm.generate_new_share();
      if (manualSync) threshold_wasm.sync_local_metadata_transitions();

      if (isMocked) {
        const sl_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());
        // check for mock of cloud storage
        // eslint-disable-next-line require-atomic-updates
        tb.storageLayer = MockStorageLayer.fromJSON(sl_after_rust);
      }
      if (resp1.privKey.toString("hex") !== threshold_wasm.get_priv_key()) {
        fail("key should be able to be reconstructed");
      }

      // Try generate new share from TS
      await rejects(
        async () => {
          await tb.generateNewShare();
          await tb.syncLocalMetadataTransitions();
          console.log("passsed sync metadata");
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
    beforeEach("Setup Stress Test", async function () {
      // const postboxKey = getTempKey();
      // tkey = new ThresholdKey({ serviceProvider: newSP(postboxKey), storageLayer: initStorageLayer(), manualSync: mode });
      // await tkey._initializeNewKey({ initializeModules: true });
      // await tkey.syncLocalMetadataTransitions();
    });
    const randomBool = () => Math.random() >= 0.5;

    const randomInPool = (pool) => randomInt(pool) === 0;

    const randomIndex = (pool) => Math.floor(Math.random() * pool);

    it(`#stress test, manualSync=${manualSync}`, async function () {
      // initialize in rust
      const postboxKey = getTempKey();
      const threshold_wasm_initial = createThresholdWasm(postboxKey);
      threshold_wasm_initial.initialize();
      threshold_wasm_initial.reconstruct_key(true);
      const deviceIndex = threshold_wasm_initial.get_current_share_indexes().filter((x) => x !== "1");
      const deviceShare = threshold_wasm_initial.export_share(deviceIndex[0]);

      const newShareIndexAccumulated = [];
      const newShareIndexAvailable = [];

      const privateKeyModuleAccumulated = [];
      const privateKeyModuleAvailable = [];

      // const seedPhraseModuleAccumulated = [];
      // const seedPhraseModuleAvailable = [];

      //
      let threshold_wasm = threshold_wasm_initial;
      for (let j = 0; j < 10; j++) {
        // generate in rust
        if (randomBool()) {
          const newShareIndex = threshold_wasm.generate_new_share();
          newShareIndexAccumulated.push(newShareIndex);
          newShareIndexAvailable.push(newShareIndex);
        }

        // delete in rust
        if (randomInPool(3)) {
          const targetIndex = randomIndex(newShareIndexAccumulated);
          const target = newShareIndexAccumulated[targetIndex];
          const indexOf = newShareIndexAvailable.indexOf(target);
          try {
            threshold_wasm.delete_share(target);
            if (indexOf > -1) {
              newShareIndexAvailable.splice(indexOf, 1);
            } else {
              fail("target should be in available");
            }
          } catch (err) {
            if (indexOf < -1) {
              fail("delete share in rust should not fail");
            }
          }
        }

        // security question in rust
        if (randomBool()) {
          try {
            const question = threshold_wasm.get_security_questions();
            console.log(question);
            // get question and try answer
            threshold_wasm.change_security_question_and_answer("new_answer", "new_question");
          } catch (err) {
            threshold_wasm.generate_new_share_with_security_question("answer", "question");
          }
        }

        // check share description in rust
        // add share description in rust
        // add module private key in rust
        // add module seed phrase in rust

        if (manualSync) threshold_wasm.sync_local_metadata_transitions();
        const storage_after_rust = JSON.parse(threshold_wasm.storage_layer_to_json());
        threshold_wasm.free();

        // reconstruct back in ts
        const tkey = new ThresholdKey({
          serviceProvider: newSP(postboxKey),
          storageLayer: initStorageLayer({ storage: storage_after_rust }),
          manualSync,
          modules: {
            securityQuestions: new SecurityQuestionsModule(),
            privateKeyModule: new PrivateKeyModule([new SECP256K1Format()]),
            seedPhrase: new SeedPhraseModule([new MetamaskSeedPhraseFormat()]),
          },
        });
        await tkey.initialize();
        await tkey.inputShare(deviceShare);
        await tkey.reconstructKey(true);

        // generate share in ts
        if (randomBool()) {
          const newShareIndex = (await tkey.generateNewShare()).newShareIndex.toString("hex");
          newShareIndexAccumulated.push(newShareIndex);
          newShareIndexAvailable.push(newShareIndex);
        }

        // delete share in ts
        if (randomInPool(3)) {
          const targetIndex = randomIndex(newShareIndexAccumulated);
          const target = newShareIndexAccumulated[targetIndex];
          const indexOf = newShareIndexAvailable.indexOf(target);
          try {
            // threshold_wasm.delete_share(newShareIndexAccumulated[target]);
            if (indexOf > -1) {
              await tkey.deleteShare(target);
              newShareIndexAvailable.splice(indexOf, 1);
            } else {
              fail("target should be in available");
            }
          } catch (err) {
            if (indexOf > -1) {
              fail("should not fail");
            }
          }
        }

        // add security question in ts
        if (randomBool()) {
          try {
            const question = await tkey.modules.securityQuestions.getSecurityQuestions();
            // check question
            console.log(question);
            await tkey.modules.securityQuestions.changeSecurityQuestionAndAnswer("answer", "question");
          } catch (e) {
            await tkey.modules.securityQuestions.generateNewShareWithSecurityQuestions("answer", "question");
          }
        }

        // add module private key in ts
        if (randomBool()) {
          const temp = getTempKey();
          const p1 = new BN(temp, "hex");
          await tkey.modules.privateKeyModule.setPrivateKey("secp256k1n", p1);

          privateKeyModuleAccumulated.push(temp);
          privateKeyModuleAvailable.push(temp);
        }

        // add module seed phrase in ts
        // add share description in ts
        if (manualSync) await tkey.syncLocalMetadataTransitions();
        const storage_after_ts = tkey.storageLayer.toJSON();
        // reconsturct in rust
        const threshold_wasm_2 = createThresholdWasm(postboxKey, storage_after_ts);
        threshold_wasm_2.initialize();
        threshold_wasm_2.import_share(deviceShare);
        threshold_wasm_2.reconstruct_key(true);

        threshold_wasm = threshold_wasm_2;
      }

      threshold_wasm.free();
    });
  });
};
