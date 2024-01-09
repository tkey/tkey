import BN from "bn.js";
import type { curve, ec } from "elliptic";

import { BNString } from "../baseTypes/commonTypes";
import { getEllipticCurve, KeyType } from "../utils";
import Point from "./Point";

// These functions are here because BN can't be extended
// ec
export const toPrivKeyEC = (bn: BN, keyType?: KeyType): ec.KeyPair => getEllipticCurve(keyType || "secp256k1").keyFromPrivate(bn.toString("hex", 64));

export const getPubKeyEC = (bn: BN, keyType?: KeyType): curve.base.BasePoint =>
  getEllipticCurve(keyType || "secp256k1")
    .keyFromPrivate(bn.toString("hex", 64))
    .getPublic();

export const getPublic = function (privateKey: Buffer, keyType: KeyType): Buffer {
  return Buffer.from(
    getEllipticCurve(keyType || "secp256k1")
      .keyFromPrivate(privateKey)
      .getPublic("array")
  );
};

// ecc
export const toPrivKeyECC = (bn: BNString): Buffer => {
  const tmp = new BN(bn, "hex");
  return Buffer.from(tmp.toString("hex", 64), "hex");
};

export const getPubKeyECC = (bn: BN, keyType?: KeyType): Buffer => getPublic(toPrivKeyECC(bn), keyType || "secp256k1");

export const getPubKeyPoint = (bn: BN, keyType?: KeyType): Point => {
  const pubKeyEc = getPubKeyEC(bn, keyType || "secp256k1");
  return new Point(pubKeyEc.getX().toString("hex"), pubKeyEc.getY().toString("hex"));
};
