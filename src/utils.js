const { ec } = require("elliptic");
const EC = ec;

// const { getPublic } = require("eccrypto");

// const privKeyBnToEcc = (bnPrivKey) => {
//   return bnPrivKey.toBuffer("be", 32);
// };

// const privKeyBnToPubKeyECC = (bnPrivKey) => {
//   return getPublic(privKeyBnToEcc(bnPrivKey));
// };

const ecCurve = new EC("secp256k1");

module.exports = {
  // privKeyBnToEcc,
  // privKeyBnToPubKeyECC,
  ecCurve,
};
