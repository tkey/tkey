const { ec } = require("elliptic");
let { decrypt, encrypt } = require("eccrypto");
const EC = ec;

// const { getPublic } = require("eccrypto");

// const privKeyBnToEcc = (bnPrivKey) => {
//   return bnPrivKey.toBuffer("be", 32);
// };

// const privKeyBnToPubKeyECC = (bnPrivKey) => {
//   return getPublic(privKeyBnToEcc(bnPrivKey));
// };

const ecCurve = new EC("secp256k1");

const ecEncrypt = encrypt;
const ecDecrypt = decrypt;

// Wrappers around ECC encrypt/decrypt to use the hex serialization
// TODO: refactor to take BN
async function editedEncrypt(publicKey, msg) {
  let encryptedDetails;
  try {
    encryptedDetails = await ecEncrypt(publicKey, msg);
  } catch (err) {
    throw err;
  }
  return {
    ciphertext: encryptedDetails.ciphertext.toString("hex"),
    ephemPublicKey: encryptedDetails.ephemPublicKey.toString("hex"),
    iv: encryptedDetails.iv.toString("hex"),
    mac: encryptedDetails.mac.toString("hex"),
  };
}

async function editedDecrypt(privKey, msg) {
  const bufferEncDetails = {
    ciphertext: Buffer.from(msg.ciphertext, "hex"),
    ephemPublicKey: Buffer.from(msg.ephemPublicKey, "hex"),
    iv: Buffer.from(msg.iv, "hex"),
    mac: Buffer.from(msg.mac, "hex"),
  };
  let decryption;
  try {
    decryption = await ecDecrypt(privKey, bufferEncDetails);
  } catch (err) {
    return err;
  }
  return decryption;
}

module.exports = {
  // privKeyBnToEcc,
  // privKeyBnToPubKeyECC,
  encrypt: editedEncrypt,
  decrypt: editedDecrypt,
  ecCurve,
};
