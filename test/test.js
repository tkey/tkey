const { deepStrictEqual } = require("assert");
const BN = require("bn.js");
// const { getPublic } = require("eccrypto");

const ThresholdBak = require("../src/index");
const TorusServiceProvider = require("../src/service-provider");
const { privKeyBnToPubKeyECC } = require("../src/utils");

global.fetch = require("node-fetch");

describe("threshold bak", function () {
  it("#should return correct values when not skipping - mainnet", async function () {
    debugger;
    const tb = new ThresholdBak();
    await tb.initializeNewKey();
    const resp2 = await tb.retrieveMetadata();
    console.log(resp2);
  });
});

// describe("TorusServiceProvider", function () {
//   it("#should encrypt and decrypt correctly", async function () {
//     const privKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d";
//     const message = Buffer.from("hello world");
//     const pubKey = privKeyBnToPubKeyECC(new BN(privKey, 16));
//     const tsp = new TorusServiceProvider({ postboxKey: privKey });
//     const encDeets = await tsp.encrypt(pubKey, message);
//     const result = await tsp.decrypt(encDeets);
//     deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
//   });
// });
