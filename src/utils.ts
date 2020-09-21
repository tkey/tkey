import { decrypt as ecDecrypt, encrypt as ecEncrypt } from "@toruslabs/eccrypto";
import { ec as EC } from "elliptic";

import { EncryptedMessage } from "./baseTypes/commonTypes";

// const privKeyBnToEcc = (bnPrivKey) => {
//   return bnPrivKey.toBuffer("be", 32);
// };

// const privKeyBnToPubKeyECC = (bnPrivKey) => {
//   return getPublic(privKeyBnToEcc(bnPrivKey));
// };

const ecCurve = new EC("secp256k1");

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

async function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<Buffer> {
  const bufferEncDetails = {
    ciphertext: Buffer.from(msg.ciphertext, "hex"),
    ephemPublicKey: Buffer.from(msg.ephemPublicKey, "hex"),
    iv: Buffer.from(msg.iv, "hex"),
    mac: Buffer.from(msg.mac, "hex"),
  };

  return ecDecrypt(privKey, bufferEncDetails);
}

function isEmptyObject(obj: unknown): boolean {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export const isErrorObj = (err: Error): boolean => err && err.stack && err.message !== "";

function prettyPrintError(error: Error): string {
  if (isErrorObj(error)) {
    return error.message;
  }
  return error.toString();
}

function normalize(input: number | string): string {
  if (!input) {
    return undefined;
  }
  let hexString;

  if (typeof input === "number") {
    hexString = input.toString(16);
    if (hexString.length % 2) {
      hexString = `0${hexString}`;
    }
  }

  if (typeof input === "string") {
    hexString = input.toLowerCase();
  }

  return `0x${hexString}`;
}

export {
  // privKeyBnToEcc,
  // privKeyBnToPubKeyECC,
  isEmptyObject,
  encrypt,
  decrypt,
  ecCurve,
  prettyPrintError,
  normalize,
};
