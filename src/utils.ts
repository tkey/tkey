import { decrypt as ecDecrypt, encrypt as ecEncrypt } from "eccrypto";
import { ec as EC } from "elliptic";
// const { getPublic } = require("eccrypto");

// const privKeyBnToEcc = (bnPrivKey) => {
//   return bnPrivKey.toBuffer("be", 32);
// };

// const privKeyBnToPubKeyECC = (bnPrivKey) => {
//   return getPublic(privKeyBnToEcc(bnPrivKey));
// };

const ecCurve = new EC("secp256k1");

interface EncryptedMessage {
  ciphertext: string;
  ephemPublicKey: string;
  iv: string;
  mac: string;
}

// Wrappers around ECC encrypt/decrypt to use the hex serialization
// TODO: refactor to take BN
async function encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage> {
  const encryptedDetails = await ecEncrypt(publicKey, msg);

  return {
    ciphertext: encryptedDetails.ciphertext.toString("hex"),
    ephemPublicKey: encryptedDetails.ephemPublicKey.toString("hex"),
    iv: encryptedDetails.iv.toString("hex"),
    mac: encryptedDetails.mac.toString("hex"),
  };
}

async function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<string> {
  const bufferEncDetails = {
    ciphertext: Buffer.from(msg.ciphertext, "hex"),
    ephemPublicKey: Buffer.from(msg.ephemPublicKey, "hex"),
    iv: Buffer.from(msg.iv, "hex"),
    mac: Buffer.from(msg.mac, "hex"),
  };
  const decryption = await ecDecrypt(privKey, bufferEncDetails);

  return decryption;
}

function isEmptyObject(obj: unknown): boolean {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export {
  // privKeyBnToEcc,
  // privKeyBnToPubKeyECC,
  isEmptyObject,
  encrypt,
  decrypt,
  ecCurve,
};
