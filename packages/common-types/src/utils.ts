import { bytesToHex, hexToBytes } from "@noble/curves/abstract/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { serializeError } from "@toruslabs/customauth";
import { decrypt as ecDecrypt, encrypt as ecEncrypt } from "@toruslabs/eccrypto";
import { keccak256, toChecksumAddress } from "@toruslabs/torus.js";

import { EncryptedMessage } from "./baseTypes/commonTypes";

export type HexString = `0x${string}`;

export const prefix0x = (value: string): HexString => {
  if (value.startsWith("0x")) {
    return value as HexString;
  }
  return `0x${value}`;
};

export const strip0x = (value: string): string => {
  if (value.startsWith("0x")) {
    return value.substring(2);
  }
  return value;
};

export const bigIntToHex = (value: bigint): HexString => {
  return `0x${value.toString(16)}`;
};

export function bigIntUmod(a: bigint, m: bigint): bigint {
  // return a % m;
  return ((a % m) + m) % m;
}

// Wrappers around ECC encrypt/decrypt to use the hex serialization
// TODO: refactor to take BN
export async function encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage> {
  const encryptedDetails = await ecEncrypt(publicKey, msg);

  return {
    ciphertext: bytesToHex(encryptedDetails.ciphertext),
    ephemPublicKey: bytesToHex(encryptedDetails.ephemPublicKey),
    iv: bytesToHex(encryptedDetails.iv),
    mac: bytesToHex(encryptedDetails.mac),
  };
}

export async function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<Uint8Array> {
  const bufferEncDetails = {
    ciphertext: hexToBytes(msg.ciphertext),
    ephemPublicKey: hexToBytes(msg.ephemPublicKey),
    iv: hexToBytes(msg.iv),
    mac: hexToBytes(msg.mac),
  };

  return ecDecrypt(privKey, bufferEncDetails);
}

export function isEmptyObject(obj: unknown): boolean {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

export const isErrorObj = (err: unknown): boolean => err && (err as Error).stack && (err as Error).message !== "";

export async function prettyPrintError(error: unknown): Promise<Error> {
  if (isErrorObj(error)) {
    return error as Error;
  }
  return serializeError(error);
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

export function generatePrivateExcludingIndexes(shareIndexes: Array<bigint>): bigint {
  const key = BigInt(prefix0x(bytesToHex(secp256k1.utils.randomPrivateKey())));
  if (shareIndexes.find((el) => el === key)) {
    return generatePrivateExcludingIndexes(shareIndexes);
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
