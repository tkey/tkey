import { decrypt as ecDecrypt, encrypt as ecEncrypt } from "@toruslabs/eccrypto";
import { toChecksumAddress } from "@toruslabs/torus.js";
import BN from "bn.js";
import { keccak256 } from "ethereum-cryptography/keccak";
// import { keccak512 } from "ethereum-cryptography/keccak";
import { serializeError } from "serialize-error";

import { EncryptedMessage, KeyType, keyTypeToCurve } from "./baseTypes/commonTypes";

export const generatePrivate = (keyType: KeyType): BN => {
  const ecCurve = keyTypeToCurve(keyType);
  const key = ecCurve.genKeyPair();
  return key.getPrivate();
};

export const ed25519ToSecp256k1 = (privateKey: BN): BN => {
  const hashedPrivateKey = keccak256(privateKey.toBuffer());
  const curveN = keyTypeToCurve(KeyType.secp256k1).n;
  return new BN(hashedPrivateKey).umod(curveN);
};

// Wrappers around ECC encrypt/decrypt to use the hex serialization
// TODO: refactor to take BN
export async function encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage> {
  const encryptedDetails = await ecEncrypt(publicKey, msg);

  return {
    ciphertext: encryptedDetails.ciphertext.toString("hex"),
    ephemPublicKey: encryptedDetails.ephemPublicKey.toString("hex"),
    iv: encryptedDetails.iv.toString("hex"),
    mac: encryptedDetails.mac.toString("hex"),
  };
}

export async function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<Buffer> {
  const bufferEncDetails = {
    ciphertext: Buffer.from(msg.ciphertext, "hex"),
    ephemPublicKey: Buffer.from(msg.ephemPublicKey, "hex"),
    iv: Buffer.from(msg.iv, "hex"),
    mac: Buffer.from(msg.mac, "hex"),
  };

  return ecDecrypt(privKey, bufferEncDetails);
}

export async function keyTypeEncrypt(privateKey: Buffer, msg: Buffer, keyType: KeyType): Promise<EncryptedMessage> {
  const ecCurve = keyTypeToCurve(KeyType.secp256k1);
  let encKey = privateKey;
  if (keyType === KeyType.ed25519) {
    encKey = ed25519ToSecp256k1(new BN(privateKey)).toBuffer();
  }
  const publicKey = ecCurve.keyFromPrivate(encKey).getPublic().encode("array", true);
  return encrypt(Buffer.from(publicKey), msg);
}

export async function keyTypeDecrypt(privateKey: Buffer, msg: EncryptedMessage, keyType: KeyType): Promise<Buffer> {
  let encKey = privateKey;
  if (keyType === KeyType.ed25519) {
    encKey = ed25519ToSecp256k1(new BN(privateKey)).toBuffer();
  }
  return decrypt(encKey, msg);
}

export function isEmptyObject(obj: unknown): boolean {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export const isErrorObj = (err: Error): boolean => err && err.stack && err.message !== "";

export function prettyPrintError(error: Error): string {
  if (isErrorObj(error)) {
    return error.message;
  }
  return JSON.stringify(serializeError(error));
}

export function generateAddressFromPublicKey(publicKey: Buffer): string {
  const ethAddressLower = `0x${keccak256(publicKey).slice(64 - 38)}`;
  return toChecksumAddress(ethAddressLower);
}

export function normalize(input: number | string): string {
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

export function generatePrivateExcludingIndexes(shareIndexes: Array<BN>, keyType: KeyType): BN {
  const key = generatePrivate(keyType);
  if (shareIndexes.find((el) => el.eq(key))) {
    return generatePrivateExcludingIndexes(shareIndexes, keyType);
  }
  return key;
}

export const KEY_NOT_FOUND = "KEY_NOT_FOUND";
export const SHARE_DELETED = "SHARE_DELETED";

export function derivePubKeyXFromPolyID(polyID: string): string {
  return polyID.split("|")[0].slice(2);
}

export function stripHexPrefix(str: string): string {
  if (str.slice(0, 2) === "0x") return str.slice(2);
  return str;
}

export function generateID(): string {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return `${Math.random().toString(36).substr(2, 9)}`;
}
