const { deepStrictEqual, fail } = require("assert");
const { Point, BN } = require("../src/types.js");
const { generatePrivate } = require("eccrypto");

const {
  ThresholdBak,
  Polynomial,
  Metadata,
  generateRandomPolynomial,
  lagrangeInterpolation,
  lagrangeInterpolatePolynomial,
} = require("../src/index");
const TorusServiceProvider = require("../src/service-provider");
const TorusStorageLayer = require("../src/storage-layer");
// const { privKeyBnToPubKeyECC } = require("../src/utils");

global.fetch = require("node-fetch");

// describe("threshold bak", function () {
//   it("#should return correct values when initializing a key", async function () {
//     const tb = new ThresholdBak();
//     const resp1 = await tb.initializeNewKey();
//     console.log("resp1", resp1);
//     const tb2 = new ThresholdBak();
//     await tb2.initialize();
//     tb2.addShare(resp1.deviceShare);
//     const reconstructedKey = tb2.reconstructKey();
//     console.log("resp2", reconstructedKey);
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

//     let serializedMetadata = JSON.stringify(metadata);
//     const deserializedMetadata = new Metadata(JSON.parse(serializedMetadata));
//     deepStrictEqual(metadata, deserializedMetadata, "metadata and deserializedMetadata should be equal");
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

describe("lagrangeInterpolatePolynomial", function () {
  it("#should interpolate basic poly correctly", async function () {
    let polyArr = [new BN(5), new BN(2)];
    let poly = new Polynomial(polyArr);
    let share1 = poly.polyEval(new BN(1));
    let share2 = poly.polyEval(new BN(2));
    let resultPoly = lagrangeInterpolatePolynomial([new Point(new BN(1), share1), new Point(new BN(2), share2)]);
    if (polyArr[0].cmp(resultPoly.polynomial[0]) != 0) {
      fail("poly result should equal hardcoded poly");
    }
    if (polyArr[1].cmp(resultPoly.polynomial[1]) != 0) {
      fail("poly result should equal hardcoded poly");
    }
  });
  it("#should interpolate random poly correctly", async function () {
    let degree = Math.floor(Math.random() * (50 - 1)) + 1;
    let poly = generateRandomPolynomial(degree);
    let pointArr = [];
    for (let i = 0; i < degree + 1; i++) {
      let shareIndex = new BN(generatePrivate());
      pointArr.push(new Point(shareIndex, poly.polyEval(shareIndex)));
    }
    let resultPoly = lagrangeInterpolatePolynomial(pointArr);
    resultPoly.polynomial.forEach(function (coeff, i) {
      if (poly.polynomial[i].cmp(coeff) != 0) {
        fail("poly result should equal hardcoded poly");
      }
    });
  });
});
