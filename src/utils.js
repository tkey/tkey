const { getPublic } = require("eccrypto");

const privKeyBnToEcc = (bnPrivKey) => {
  return bnPrivKey.toBuffer("be", 32);
};

const privKeyBnToPubKeyECC = (bnPrivKey) => {
  return getPublic(privKeyBnToEcc(bnPrivKey));
};

module.exports = {
  privKeyBnToEcc,
  privKeyBnToPubKeyECC,
};
