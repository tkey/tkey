const { deepStrictEqual, deepEqual, equal, fail } = require("assert");
const { Point, BN, Polynomial } = require("../src/types.js");
const { generatePrivate } = require("eccrypto");
const { ecCurve } = require("../src/utils");

const { ThresholdBak, Metadata, generateRandomPolynomial, lagrangeInterpolation, lagrangeInterpolatePolynomial } = require("../src/index");
const TorusServiceProvider = require("../src/service-provider");
const TorusStorageLayer = require("../src/storage-layer");
const SecurityQuestionsModule = require("../src/security-qns-module");
const { keccak256 } = require("web3-utils");

const defaultSP = new TorusServiceProvider();
const defaultSL = new TorusStorageLayer({ serviceProvider: defaultSP });
// const { privKeyBnToPubKeyECC } = require("../src/utils");

global.fetch = require("node-fetch");

// describe("threshold bak", function () {
//   it("#should be able to reconstruct key when initializing a key", async function () {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     const resp1 = await tb.initializeNewKey();
//     const tb2 = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     await tb2.initialize();
//     tb2.inputShare(resp1.deviceShare);
//     const reconstructedKey = tb2.reconstructKey();
//     if (resp1.privKey.cmp(reconstructedKey) != 0) {
//       fail("key should be able to be reconstructed");
//     }
//   });
//   it("#should be able to reconstruct key when initializing a  with user input", async function () {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
//     userInput = userInput.umod(ecCurve.curve.n);
//     const resp1 = await tb.initializeNewKey(userInput);
//     const tb2 = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     await tb2.initialize();
//     tb2.inputShare(resp1.userShare);
//     const reconstructedKey = tb2.reconstructKey();
//     if (resp1.privKey.cmp(reconstructedKey) != 0) {
//       fail("key should be able to be reconstructed");
//     }
//   });
//   it("#should be able to reshare a key and retrieve from service provider", async function () {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     const resp1 = await tb.initializeNewKey();
//     const tb2 = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     await tb2.initialize();
//     tb2.inputShare(resp1.deviceShare);
//     const reconstructedKey = tb2.reconstructKey();
//     if (resp1.privKey.cmp(reconstructedKey) != 0) {
//       fail("key should be able to be reconstructed");
//     }
//     let resp2 = await tb2.generateNewShare();
//     const tb3 = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     await tb3.initialize();
//     tb3.inputShare(resp2.newShareStores[resp2.newShareIndex.toString("hex")]);
//     let finalKey = tb3.reconstructKey();
//     if (resp1.privKey.cmp(finalKey) != 0) {
//       fail("key should be able to be reconstructed after adding new share");
//     }
//   });
//   it("#should be able to reconstruct key when initializing a with a share ", async function () {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
//     userInput = userInput.umod(ecCurve.curve.n);
//     const resp1 = await tb.initializeNewKey(userInput);
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb2 = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     await tb2.initialize(resp1.userShare);
//     tb2.inputShare(resp1.deviceShare);
//     const reconstructedKey = tb2.reconstructKey();
//     if (resp1.privKey.cmp(reconstructedKey) != 0) {
//       fail("key should be able to be reconstructed");
//     }
//   });
//   it("#should be able to reconstruct key after refresh and intializeing with a share ", async function () {
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     let userInput = new BN(keccak256("user answer blublu").slice(2), "hex");
//     userInput = userInput.umod(ecCurve.curve.n);
//     const resp1 = await tb.initializeNewKey(userInput);
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const newShares = await tb.generateNewShare();
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     const tb2 = new ThresholdBak({ serviceProvider: defaultSP, storageLayer: defaultSL });
//     await tb2.initialize(resp1.userShare);
//     tb2.inputShare(newShares.newShareStores[resp1.deviceShare.share.shareIndex.toString("hex")]);
//     const reconstructedKey = tb2.reconstructKey();
//     if (resp1.privKey.cmp(reconstructedKey) != 0) {
//       fail("key should be able to be reconstructed");
//     }
//   });
// });

// describe("TorusServiceProvider", function () {
//   it("#should encrypt and decrypt correctly", async function () {
//     const privKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d";
//     let tmp = new BN(123);
//     const message = Buffer.from(tmp.toString("hex", 15));
//     const privKeyBN = new BN(privKey, 16);
//     const tsp = new TorusServiceProvider({ postboxKey: privKey });
//     const encDeets = await tsp.encrypt(privKeyBN.getPubKeyECC(), message);
//     const result = await tsp.decrypt(encDeets);
//     deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
//   });

//   it("#should encrypt and decrypt correctly messages > 15", async function () {
//     const privKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d";
//     let tmp = new BN(123);
//     const message = Buffer.from(tmp.toString("hex", 16));
//     const privKeyBN = new BN(privKey, 16);
//     const tsp = new TorusServiceProvider({ postboxKey: privKey });
//     const encDeets = await tsp.encrypt(privKeyBN.getPubKeyECC(), message);
//     const result = await tsp.decrypt(encDeets);
//     deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
//   });
// });

// describe("TorusStorageLayer", function () {
//   it("#should get or set correctly", async function () {
//     const privKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d";
//     const tsp = new TorusServiceProvider({ postboxKey: privKey });
//     const storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: tsp });
//     const message = { test: Math.random().toString(36).substring(7) };
//     await storageLayer.setMetadata(message);
//     let resp = await storageLayer.getMetadata();
//     deepStrictEqual(resp, message, "set and get message should be equal");
//   });
//   it("#should get or set with specified private key correctly", async function () {
//     const privKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d";
//     const privKeyBN = new BN(privKey, 16);
//     const tsp = new TorusServiceProvider({ postboxKey: privKey });
//     const storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: tsp });
//     const message = { test: Math.random().toString(36).substring(7) };
//     await storageLayer.setMetadata(message, privKeyBN);
//     let resp = await storageLayer.getMetadata(privKeyBN);
//     deepStrictEqual(resp, message, "set and get message should be equal");
//   });
// });

// describe("polynomial", function () {
//   it("#should polyEval indexes correctly", async function () {
//     let polyArr = [new BN(5), new BN(2)];
//     let poly = new Polynomial(polyArr);
//     result = poly.polyEval(new BN(1));
//     if (result.cmp(new BN(7)) != 0) {
//       fail("poly result should equal 7");
//     }
//   });
// });

// describe("Metadata", function () {
//   it("#should serialize and deserialize into JSON seamlessly", async function () {
//     const privKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d";
//     const privKeyBN = new BN(privKey, 16);
//     // create a random poly and respective shares
//     const shareIndexes = [new BN(1), new BN(2)];
//     for (let i = 1; i <= 2; i++) {
//       let ran = generatePrivate();
//       while (ran < 2) {
//         ran = generatePrivate();
//       }
//       shareIndexes.push(new BN(ran));
//     }
//     const poly = generateRandomPolynomial(1, privKeyBN);
//     const shares = poly.generateShares(shareIndexes);
//     const metadata = new Metadata(privKeyBN.getPubKeyPoint());
//     metadata.addFromPolynomialAndShares(poly, shares);
//     metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });

//     let serializedMetadata = JSON.stringify(metadata);
//     const deserializedMetadata = new Metadata(JSON.parse(serializedMetadata));
//     let secondSerialization = JSON.stringify(deserializedMetadata);

//     // this one fails becauseof BN.js serilaization/deserialization on hex. Isnt breaking just annoying
//     // deepEqual(metadata, deserializedMetadata, "metadata and deserializedMetadata should be equal");
//     equal(serializedMetadata, secondSerialization, "serializedMetadata should be equal");

//     const deserializedMetadata2 = new Metadata(JSON.parse(secondSerialization));

//     // this one fails becauseof BN.js serilaization/deserialization on hex. Isnt breaking just annoying
//     deepEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
//   });
// });

// describe("lagrange interpolate", function () {
//   it("#should interpolate secret correctly", async function () {
//     let polyArr = [new BN(5), new BN(2)];
//     let poly = new Polynomial(polyArr);
//     let share1 = poly.polyEval(new BN(1));
//     let share2 = poly.polyEval(new BN(2));
//     let key = lagrangeInterpolation([share1, share2], [new BN(1), new BN(2)]);
//     if (key.cmp(new BN(5)) != 0) {
//       fail("poly result should equal 7");
//     }
//   });
// });

// describe("lagrangeInterpolatePolynomial", function () {
//   it("#should interpolate basic poly correctly", async function () {
//     let polyArr = [new BN(5), new BN(2)];
//     let poly = new Polynomial(polyArr);
//     let share1 = poly.polyEval(new BN(1));
//     let share2 = poly.polyEval(new BN(2));
//     let resultPoly = lagrangeInterpolatePolynomial([new Point(new BN(1), share1), new Point(new BN(2), share2)]);
//     if (polyArr[0].cmp(resultPoly.polynomial[0]) != 0) {
//       fail("poly result should equal hardcoded poly");
//     }
//     if (polyArr[1].cmp(resultPoly.polynomial[1]) != 0) {
//       fail("poly result should equal hardcoded poly");
//     }
//   });
//   it("#should interpolate random poly correctly", async function () {
//     let degree = Math.floor(Math.random() * (50 - 1)) + 1;
//     let poly = generateRandomPolynomial(degree);
//     let pointArr = [];
//     for (let i = 0; i < degree + 1; i++) {
//       let shareIndex = new BN(generatePrivate());
//       pointArr.push(new Point(shareIndex, poly.polyEval(shareIndex)));
//     }
//     let resultPoly = lagrangeInterpolatePolynomial(pointArr);
//     resultPoly.polynomial.forEach(function (coeff, i) {
//       if (poly.polynomial[i].cmp(coeff) != 0) {
//         fail("poly result should equal hardcoded poly");
//       }
//     });
//   });
// });

describe("SecurityQuestionsModule", function () {
  it("#should be able to reconstruct key and initialize a key with seciurty questions", async function () {
    const tb = new ThresholdBak({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
    const resp1 = await tb.initializeNewKey();
    debugger;
    await tb.generateNewShareWithSecurityQuestions("blublu", "who is your cat?");
    const tb2 = new ThresholdBak({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { securityQuestions: new SecurityQuestionsModule() },
    });
    await tb2.initialize();
    await tb2.inputShareFromSecurityQuestions("blublu");
    const reconstructedKey = tb2.reconstructKey();
    if (resp1.privKey.cmp(reconstructedKey) != 0) {
      fail("key should be able to be reconstructed");
    }
  });
});
