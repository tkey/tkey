import { generatePrivate } from "@toruslabs/eccrypto";
import { deepEqual, deepStrictEqual, fail, strictEqual } from "assert";
// const { privKeyBnToPubKeyECC }  from "../src/utils";
import atob from "atob";
import BN from "bn.js";
import btoa from "btoa";
import stringify from "json-stable-stringify";
import fetch from "node-fetch";
import { keccak256 } from "web3-utils";

import { getPubKeyPoint, Point, Polynomial } from "../src/base";
import ThresholdKey from "../src/index";
import { generateRandomPolynomial, lagrangeInterpolatePolynomial, lagrangeInterpolation } from "../src/lagrangeInterpolatePolynomial";
import Metadata from "../src/metadata";
import SecurityQuestionsModule from "../src/securityQuestions/SecurityQuestionsModule";
import ServiceProviderBase from "../src/serviceProvider/ServiceProviderBase";
import ShareTransferModule from "../src/shareTransfer/shareTransferModule";
import TorusStorageLayer from "../src/storage-layer";
import { ecCurve } from "../src/utils";

const PRIVATE_KEY = "e70fb5f5970b363879bc36f54d4fc0ad77863bfd059881159251f50f48863acf";

const defaultSP = new ServiceProviderBase({ postboxKey: PRIVATE_KEY });
const defaultSL = new TorusStorageLayer({ serviceProvider: defaultSP });

global.fetch = fetch;
global.atob = atob;
global.btoa = btoa;

describe("tkey", function () {
  let tb;
  beforeEach("Setup ThresholdKey", async function () {
    tb = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
  });

  it("#should be able to reconstruct key when initializing a key", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize();
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reconstruct key when initializing a  with user input", async function () {
    let determinedShare = new BN(keccak256("user answer blublu").slice(2), "hex");
    determinedShare = determinedShare.umod(ecCurve.curve.n);
    const resp1 = await tb.initializeNewKey({ determinedShare, initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize();
    tb2.inputShare(resp1.userShare);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reshare a key and retrieve from service provider", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize();
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
    const resp2 = await tb2.generateNewShare();
    const tb3 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb3.initialize();
    tb3.inputShare(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
    const finalKey = await tb3.reconstructKey();
    if (resp1.privKey.cmp(finalKey) !== 0) {
      fail("key should be able to be reconstructed after adding new share");
    }
  });
  it("#should be able to reconstruct key when initializing a with a share ", async function () {
    let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
    userInput = userInput.umod(ecCurve.curve.n);
    const resp1 = await tb.initializeNewKey({ userInput, initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize(resp1.userShare);
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reconstruct key after refresh and intializeing with a share ", async function () {
    let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
    userInput = userInput.umod(ecCurve.curve.n);
    const resp1 = await tb.initializeNewKey({ userInput, initializeModules: true });
    const newShares = await tb.generateNewShare();
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize(resp1.userShare);
    tb2.inputShare(newShares.newShareStores[resp1.deviceShare.share.shareIndex.toString("hex")]);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("# should serialize and deserialize correctly with user input", async function () {
    let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
    userInput = userInput.umod(ecCurve.curve.n);
    const resp1 = await tb.initializeNewKey({ userInput, initializeModules: true });
    const newShares = await tb.generateNewShare();
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize(resp1.userShare);
    tb2.inputShare(newShares.newShareStores[resp1.deviceShare.share.shareIndex.toString("hex")]);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }

    const stringified = JSON.stringify(tb2);
    const tb3 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
    const finalKey = await tb3.reconstructKey();
    strictEqual(finalKey.toString("hex"), reconstructedKey.toString("hex"), "Incorrect serialization");
  });
  it("#should be able to reshare a key and retrieve from service provider serialization", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize();
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
    const resp2 = await tb2.generateNewShare();
    const tb3 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb3.initialize();
    tb3.inputShare(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
    const finalKey = await tb3.reconstructKey();
    if (resp1.privKey.cmp(finalKey) !== 0) {
      fail("key should be able to be reconstructed after adding new share");
    }

    const stringified = JSON.stringify(tb3);
    const tb4 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
    const finalKeyPostSerialization = await tb4.reconstructKey();
    strictEqual(finalKeyPostSerialization.toString("hex"), finalKey.toString("hex"), "Incorrect serialization");
  });
});

describe("tkey reconstruction", function () {
  it("#should be able to detect a new user and reconstruct key on initialize", async function () {
    const privKey = new BN(generatePrivate());
    const uniqueSP = new ServiceProviderBase({ postboxKey: privKey.toString("hex") });
    const uniqueSL = new TorusStorageLayer({ serviceProvider: uniqueSP });
    const tb = new ThresholdKey({ serviceProvider: uniqueSP, storageLayer: uniqueSL });
    await tb.initialize();
    const reconstructedKey = await tb.reconstructKey();
    if (tb.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
});

describe("ServiceProvider", function () {
  it("#should encrypt and decrypt correctly", async function () {
    const privKey = PRIVATE_KEY;
    const tmp = new BN(123);
    const message = Buffer.from(tmp.toString("hex", 15));
    const tsp = new ServiceProviderBase({ postboxKey: privKey });
    const encDeets = await tsp.encrypt(message);
    const result = await tsp.decrypt(encDeets);
    deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
  });

  it("#should encrypt and decrypt correctly messages > 15", async function () {
    const privKey = PRIVATE_KEY;
    const tmp = new BN(123);
    const message = Buffer.from(tmp.toString("hex", 16));
    const tsp = new ServiceProviderBase({ postboxKey: privKey });
    const encDeets = await tsp.encrypt(message);
    const result = await tsp.decrypt(encDeets);
    deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
  });
});

describe("TorusStorageLayer", function () {
  it("#should get or set correctly", async function () {
    const privKey = PRIVATE_KEY;
    const tsp = new ServiceProviderBase({ postboxKey: privKey });
    const storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: tsp });
    const message = { test: Math.random().toString(36).substring(7) };
    await storageLayer.setMetadata(message);
    const resp = await storageLayer.getMetadata();
    deepStrictEqual(resp, message, "set and get message should be equal");
  });
  it("#should get or set with specified private key correctly", async function () {
    const privKey = PRIVATE_KEY;
    const privKeyBN = new BN(privKey, 16);
    const tsp = new ServiceProviderBase({ postboxKey: privKey });
    const storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: tsp });
    const message = { test: Math.random().toString(36).substring(7) };
    await storageLayer.setMetadata(message, privKeyBN);
    const resp = await storageLayer.getMetadata(privKeyBN);
    deepStrictEqual(resp, message, "set and get message should be equal");
  });
});

describe("polynomial", function () {
  it("#should polyEval indexes correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const result = poly.polyEval(new BN(1));
    if (result.cmp(new BN(7)) !== 0) {
      fail("poly result should equal 7");
    }
  });
});

describe("Metadata", function () {
  it("#should serialize and deserialize into JSON seamlessly", async function () {
    const privKey = PRIVATE_KEY;
    const privKeyBN = new BN(privKey, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    for (let i = 1; i <= 2; i += 1) {
      let ran = generatePrivate();
      while (ran < 2) {
        ran = generatePrivate();
      }
      shareIndexes.push(new BN(ran));
    }
    const poly = generateRandomPolynomial(1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(getPubKeyPoint(privKeyBN));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });
    const serializedMetadata = stringify(metadata);
    const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
    const secondSerialization = stringify(deserializedMetadata);
    deepEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
});

describe("lagrange interpolate", function () {
  it("#should interpolate secret correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const key = lagrangeInterpolation([share1, share2], [new BN(1), new BN(2)]);
    if (key.cmp(new BN(5)) !== 0) {
      fail("poly result should equal 7");
    }
  });
  it("#should interpolate random secrets correctly", async function () {
    const degree = Math.ceil(Math.random() * 10);
    const secret = new BN(generatePrivate());
    const poly = generateRandomPolynomial(degree, secret);
    const shares = [];
    const indexes = [];
    for (let i = 1; i <= degree + 1; i += 1) {
      indexes.push(new BN(i));
      shares.push(poly.polyEval(new BN(i)));
    }
    const key = lagrangeInterpolation(shares, indexes);
    if (key.cmp(secret) !== 0) {
      fail("lagranged scalar should equal secret");
    }
  });
});

describe("lagrangeInterpolatePolynomial", function () {
  it("#should interpolate basic poly correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const resultPoly = lagrangeInterpolatePolynomial([new Point(new BN(1), share1), new Point(new BN(2), share2)]);
    if (polyArr[0].cmp(resultPoly.polynomial[0]) !== 0) {
      fail("poly result should equal hardcoded poly");
    }
    if (polyArr[1].cmp(resultPoly.polynomial[1]) !== 0) {
      fail("poly result should equal hardcoded poly");
    }
  });
  it("#should interpolate random poly correctly", async function () {
    const degree = Math.floor(Math.random() * (50 - 1)) + 1;
    const poly = generateRandomPolynomial(degree);
    const pointArr = [];
    for (let i = 0; i < degree + 1; i += 1) {
      const shareIndex = new BN(generatePrivate());
      pointArr.push(new Point(shareIndex, poly.polyEval(shareIndex)));
    }
    const resultPoly = lagrangeInterpolatePolynomial(pointArr);
    resultPoly.polynomial.forEach(function (coeff, i) {
      if (poly.polynomial[i].cmp(coeff) !== 0) {
        fail("poly result should equal hardcoded poly");
      }
    });
  });
});

describe("SecurityQuestionsModule", function () {
  let tb;
  beforeEach("initialize security questions module", async function () {
    tb = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
  });
  it("#should be able to reconstruct key and initialize a key with seciurty questions", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
    await tb2.initialize();

    await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reconstruct key and initialize a key with seciurty questions after refresh", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
    await tb.generateNewShare();
    await tb2.initialize();

    await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to change password", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
    await tb.modules.securityQuestions.changeSecurityQuestionAndAnswer("dodo", "who is your cat?");

    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
    await tb2.initialize();

    await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("dodo");
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to change password and serialize", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
    await tb.modules.securityQuestions.changeSecurityQuestionAndAnswer("dodo", "who is your cat?");

    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
    await tb2.initialize();

    await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("dodo");
    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }

    const stringified = JSON.stringify(tb2);
    const tb4 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
    const finalKeyPostSerialization = await tb4.reconstructKey();
    strictEqual(finalKeyPostSerialization.toString("hex"), reconstructedKey.toString("hex"), "Incorrect serialization");
  });
});

describe("ShareTransferModule", function () {
  it("#should be able to transfer share via the module", async function () {
    const tb = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { shareTransfer: new ShareTransferModule() },
    });
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { shareTransfer: new ShareTransferModule() },
    });
    await tb2.initialize();

    // usually should be called in callback, but mocha does not allow
    const pubkey = await tb2.modules.shareTransfer.requestNewShare();

    // eslint-disable-next-line promise/param-names
    await new Promise((res) => {
      setTimeout(res, 200);
    });
    const result = await tb.generateNewShare();
    await tb.modules.shareTransfer.approveRequest(pubkey, result.newShareStores[result.newShareIndex.toString("hex")]);

    // eslint-disable-next-line promise/param-names
    await new Promise((res) => {
      setTimeout(res, 1001);
    });

    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  // it("#should be able to reconstruct key and initialize a key with seciurty questions after refresh", async function () {
  //   const tb = new ThresholdKey({
  //     serviceProvider: defaultSP,
  //     storageLayer: defaultSL,
  //     modules: { securityQuestions: new SecurityQuestionsModule() },
  //   });
  //   const resp1 = await tb.initializeNewKey({ initializeModules: true });
  //   await tb.modules.securityQuestions.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
  //   const tb2 = new ThresholdKey({
  //     serviceProvider: defaultSP,
  //     storageLayer: defaultSL,
  //     modules: { securityQuestions: new SecurityQuestionsModule() },
  //   });
  //   await tb.generateNewShare();
  //   await tb2.initialize();

  //   await tb2.modules.securityQuestions.inputShareFromSecurityQuestions("blublu");
  //   const reconstructedKey = await tb2.reconstructKey();
  //   if (resp1.privKey.cmp(reconstructedKey) !== 0) {
  //     fail("key should be able to be reconstructed");
  //   }
  // });
});
