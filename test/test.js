import { generatePrivate } from "@toruslabs/eccrypto";
import { deepStrictEqual, fail, strictEqual } from "assert";
// const { privKeyBnToPubKeyECC }  from "../src/utils";
import atob from "atob";
import BN from "bn.js";
import btoa from "btoa";
import stringify from "json-stable-stringify";
import fetch from "node-fetch";
import { keccak256 } from "web3-utils";

import { getPubKeyPoint, Point, Polynomial } from "../src/base";
import ThresholdKey from "../src/index";
import {
  generateRandomPolynomial,
  lagrangeInterpolatePolynomial,
  lagrangeInterpolation,
  polyCommitmentEval,
} from "../src/lagrangeInterpolatePolynomial";
import Metadata from "../src/metadata";
import SecurityQuestionsModule from "../src/securityQuestions/SecurityQuestionsModule";
import MetamaskSeedPhraseFormat from "../src/seedPhrase/MetamaskSeedPhraseFormat";
import SeedPhraseModule from "../src/seedPhrase/SeedPhrase";
import ServiceProviderBase from "../src/serviceProvider/ServiceProviderBase";
import ShareTransferModule from "../src/shareTransfer/ShareTransferModule";
import TorusStorageLayer from "../src/storage-layer";
import { ecCurve } from "../src/utils";

const PRIVATE_KEY = "e70fb5f5970b363879bc36f54d4fc0ad77863bfd059881159251f50f48863acf";
const PRIVATE_KEY_2 = "2e6824ef22a58b7b5c8938c38e9debd03611f074244f213943e3fa3047ef2385";

const defaultSP = new ServiceProviderBase({ postboxKey: PRIVATE_KEY });
const defaultSL = new TorusStorageLayer({ serviceProvider: defaultSP, hostUrl: "http://localhost:5051" });

global.fetch = fetch;
global.atob = atob;
global.btoa = btoa;

function compareBNArray(a, b, message) {
  if (a.length !== b.length) fail(message);
  return a.map((el, index) => {
    // console.log(el, b[index], el.cmp(b[index]));
    // eslint-disable-next-line no-unused-expressions
    el.cmp(b[index]) !== 0 ? fail(message) : undefined;
    return 0;
  });
}

function compareReconstructedKeys(a, b, message) {
  // eslint-disable-next-line no-unused-expressions
  a.privKey.cmp(b.privKey) !== 0 ? fail(message) : undefined;
  compareBNArray(a.seedPhrase, b.seedPhrase, message);
  compareBNArray(a.allKeys, b.allKeys, message);
}

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
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reshare a key and retrieve from service provider", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize();
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey();
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
    const resp2 = await tb2.generateNewShare();
    const tb3 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb3.initialize();
    tb3.inputShare(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
    const finalKey = await tb3.reconstructKey();
    // compareBNArray(resp1.privKey, finalKey, "key should be able to be reconstructed after adding new share");
    if (resp1.privKey.cmp(finalKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
    const resp2 = await tb2.generateNewShare();
    const tb3 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb3.initialize();
    tb3.inputShare(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
    const finalKey = await tb3.reconstructKey();
    // compareBNArray(resp1.privKey, finalKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(finalKey.privKey) !== 0) {
      fail("key should be able to be reconstructed after adding new share");
    }

    const stringified = JSON.stringify(tb3);
    const tb4 = await ThresholdKey.fromJSON(JSON.parse(stringified), { serviceProvider: defaultSP, storageLayer: defaultSL });
    const finalKeyPostSerialization = await tb4.reconstructKey();
    strictEqual(finalKeyPostSerialization.toString("hex"), finalKey.toString("hex"), "Incorrect serialization");
  });
  it("#should be able to import and reconstruct an imported key", async function () {
    const importedKey = new BN(generatePrivate());
    const resp1 = await tb.initializeNewKey({ importedKey, initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize();
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey();
    // compareBNArray([importedKey], reconstructedKey, "key should be able to be reconstructed");
    if (importedKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reconstruct key, even with old metadata", async function () {
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    const tb2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL });
    await tb2.initialize(); // initialize sdk with old metadata
    tb.generateNewShare(); // generate new share to update metadata
    tb2.inputShare(resp1.deviceShare);
    const reconstructedKey = await tb2.reconstructKey(); // reconstruct key with old metadata should work to poly
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
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
    // compareBNArray(tb.getKey(), reconstructedKey, "key should be able to be reconstructed");
    if (tb.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    await storageLayer.setMetadata(message, tsp.postboxKey);
    const resp = await storageLayer.getMetadata(tsp.postboxKey);
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
  it("#should get or set with array of specified private keys correctly", async function () {
    const privKey = PRIVATE_KEY;
    const privKeyBN = new BN(privKey, 16);
    const tsp = new ServiceProviderBase({ postboxKey: privKey });
    const storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: tsp });
    const message = { test: Math.random().toString(36).substring(7) };

    const privKey2 = PRIVATE_KEY_2;
    const privKeyBN2 = new BN(privKey2, 16);
    const message2 = { test: Math.random().toString(36).substring(7) };

    await storageLayer.setMetadataBulk([message, message2], [privKeyBN, privKeyBN2]);
    const resp = await storageLayer.getMetadata(privKeyBN);
    const resp2 = await storageLayer.getMetadata(privKeyBN2);

    deepStrictEqual(resp, message, "set and get message should be equal");
    deepStrictEqual(resp2, message2, "set and get message should be equal");
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
    deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
  it("#should serialize and deserialize into JSON with tkey store seamlessly", async function () {
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
    metadata.setTkeyStoreDomain("something", { test: "oh this is an object" });
    const serializedMetadata = stringify(metadata);
    const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
    const secondSerialization = stringify(deserializedMetadata);
    deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
  it("#should serialize and deserialize into JSON with tkey store seamlessly", async function () {
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
    metadata.setScopedStore("something", { test: "oh this is an object" });
    const serializedMetadata = stringify(metadata);
    const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
    const secondSerialization = stringify(deserializedMetadata);
    deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
});

describe("Point", function () {
  it("#should encode into elliptic format on encode", async function () {
    const secret = new BN(generatePrivate());
    const point = getPubKeyPoint(secret);
    const result = point.encode("elliptic-compressed", { ec: ecCurve });
    if (result.toString().slice(2) !== point.x.toString("hex", 64)) {
      fail(`elliptic format x should be equal ${secret} ${result.toString()} ${point.x.toString("hex")} ${secret.umod(ecCurve.n)}`);
    }
  });
  it("#should decode into point for elliptic format compressed", async function () {
    const secret = new BN(generatePrivate());
    const point = getPubKeyPoint(secret);
    const result = point.encode("elliptic-compressed", { ec: ecCurve });
    if (result.toString().slice(2) !== point.x.toString("hex", 64)) {
      fail("elliptic format x should be equal");
    }

    const key = ecCurve.keyFromPublic(result.toString(), "hex");
    if (point.x.cmp(key.pub.x) !== 0) {
      fail(" x should be equal");
    }
    if (point.y.cmp(key.pub.y) !== 0) {
      fail(" x should be equal");
    }
  });
  it("#should decode into point for fromCompressedPub", async function () {
    const secret = new BN(generatePrivate());
    const point = getPubKeyPoint(secret);
    const result = point.encode("elliptic-compressed", { ec: ecCurve });
    if (result.toString().slice(2) !== point.x.toString("hex", 64)) {
      fail("elliptic format x should be equal");
    }

    const key = Point.fromCompressedPub(result.toString());
    if (point.x.cmp(key.x) !== 0) {
      fail(" x should be equal");
    }
    if (point.y.cmp(key.y) !== 0) {
      fail(" x should be equal");
    }
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

describe("polyCommitmentEval", function () {
  it("#should polyCommitmentEval basic poly correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const publicPoly = poly.getPublicPolynomial();
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const expectedShareCommit1 = getPubKeyPoint(share1);
    const expectedShareCommit2 = getPubKeyPoint(share2);
    const shareCommit1 = polyCommitmentEval(publicPoly.polynomialCommitments, new BN(1));
    const shareCommit2 = polyCommitmentEval(publicPoly.polynomialCommitments, new BN(2));
    if (expectedShareCommit1.x.cmp(shareCommit1.x) !== 0) {
      fail("expected share commitment1 should equal share commitment");
    }
    if (expectedShareCommit2.x.cmp(shareCommit2.x) !== 0) {
      fail("expected share commitment2 should equal share commitment");
    }
  });
  it("#should polyCommitmentEval random poly correctly", async function () {
    const degree = Math.floor(Math.random() * (50 - 1)) + 1;
    const poly = generateRandomPolynomial(degree);
    const publicPoly = poly.getPublicPolynomial();
    const expectedShareCommitment = [];
    const shareCommitment = [];
    for (let i = 0; i < 10; i += 1) {
      const shareIndex = new BN(generatePrivate());
      expectedShareCommitment.push(getPubKeyPoint(poly.polyEval(shareIndex)));
      shareCommitment.push(polyCommitmentEval(publicPoly.polynomialCommitments, shareIndex));
    }
    expectedShareCommitment.forEach(function (expected, i) {
      if (shareCommitment[i].x.cmp(expected.x) !== 0) {
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
  it("#should be able to reconstruct key and initialize a key with security questions", async function () {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to reconstruct key and initialize a key with security questions after refresh", async function () {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // compareBNArray(resp1.privKey, reconstructedKey, "key should be able to be reconstructed");
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
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
    // await new Promise((res) => {
    //   setTimeout(res, 200);
    // });
    const result = await tb.generateNewShare();
    await tb.modules.shareTransfer.approveRequest(pubkey, result.newShareStores[result.newShareIndex.toString("hex")]);

    await tb2.modules.shareTransfer.startRequestStatusCheck(pubkey);
    // eslint-disable-next-line promise/param-names
    // await new Promise((res) => {
    //   setTimeout(res, 1001);
    // });

    const reconstructedKey = await tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey.privKey) !== 0) {
      fail("key should be able to be reconstructed");
    }
  });
  it("#should be able to transfer device share", async function () {
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
  it("#should be able to delete share transfer from another device", async function () {
    const tb = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { shareTransfer: new ShareTransferModule() },
    });
    await tb.initializeNewKey({ initializeModules: true });

    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
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
  it("#should be able to reset share transfer store", async function () {
    const tb = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { shareTransfer: new ShareTransferModule() },
    });
    await tb.initializeNewKey({ initializeModules: true });

    await tb.modules.shareTransfer.resetShareTransferStore();
    const newRequests = await tb.modules.shareTransfer.getShareTransferStore();
    if (Object.keys(newRequests).length !== 0) {
      fail("Unable to reset share store");
    }
  });
});

describe("TkeyStore", function () {
  it("#should get/set seed phrase", async function () {
    const metamaskSeedPhraseFormat = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
    const tb = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat]) },
    });
    const resp1 = await tb.initializeNewKey({ initializeModules: true });
    await tb.modules.seedPhrase.setSeedPhrase("seed sock milk update focus rotate barely fade car face mechanic mercy", "HD Key Tree");

    const metamaskSeedPhraseFormat2 = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
    const tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat2]) },
    });
    await tb2.initialize();
    tb2.inputShare(resp1.deviceShare);
    const reconstuctedKey = await tb2.reconstructKey();
    // console.log(reconstuctedKey);
    compareReconstructedKeys(reconstuctedKey, {
      privKey: resp1.privKey,
      seedPhrase: [new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex")],
      allKeys: [resp1.privKey, new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex")],
    });
  });
  it("#should be able to derive keys", async function () {
    const tb = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { seedPhrase: new SeedPhraseModule([new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68")]) },
    });
    await tb.initializeNewKey({ initializeModules: true });
    await tb.modules.seedPhrase.setSeedPhrase("seed sock milk update focus rotate barely fade car face mechanic mercy", "HD Key Tree");
    const actualPrivateKeys = [new BN("70dc3117300011918e26b02176945cc15c3d548cf49fd8418d97f93af699e46", "hex")];
    const derivedKeys = await tb.modules.seedPhrase.getAccounts();
    compareBNArray(actualPrivateKeys, derivedKeys, "key should be same");
  });

  // it("#should be able to get/set private keys", async function () {
  //   const tb = new ThresholdKey({
  //     serviceProvider: defaultSP,
  //     storageLayer: defaultSL,
  //     modules: { privateKeysModule: new PrivateKeysModule() },
  //   });
  //   await tb.initializeNewKey({ initializeModules: true });
  //   const actualPrivateKeys = [
  //     "4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390",
  //     "1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0",
  //     "7749e59f398c5ccc01f3131e00abd1d061a03ae2ae59c49bebcee61d419f7cf0",
  //     "1a99651a0aab297997bb3374451a2c40c927fab93903c1957fa9444bc4e2c770",
  //     "220dad2d2bbb8bc2f731981921a49ee6059ef9d1e5d55ee203527a3157fb7284",
  //   ];
  //   await tb.modules.privateKeysModule.setPrivateKeys(actualPrivateKeys);
  //   const keys = await tb.modules.privateKeysModule.getPrivateKeys();
  //   deepEqual(actualPrivateKeys, keys.privateKeysModule);
  // });
});
