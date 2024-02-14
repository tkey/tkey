import BN from "bn.js";
import { curve, ec as EllipticCurve } from "elliptic";

import { BNString, KeyType } from "../baseTypes/commonTypes";
import { Point } from "./Point";

// These functions are here because BN can't be extended
export const toPrivKeyEC = (bn: BN, keyType: KeyType): EllipticCurve.KeyPair => {
  const ec = new EllipticCurve(keyType.toString());
  const key = ec.keyFromPrivate(bn.toString("hex", 64), "hex");
  return key;
};

export const toPrivKeyECC = (bn: BNString, keyType: KeyType): Buffer => {
  const tmp = new BN(bn, "hex");
  const key = toPrivKeyEC(tmp, keyType);
  const privatePart = key.getPrivate();
  return Buffer.from(privatePart.toString("hex", 64), "hex");
};

export const getPubKeyEC = (bn: BN, keyType: KeyType): curve.base.BasePoint => {
  return toPrivKeyEC(bn, keyType).getPublic();
};

export const getPubKeyECC = (bn: BN, keyType: KeyType, compressed: boolean): Buffer => {
  return Buffer.from(getPubKeyEC(bn, keyType).encode("array", compressed));
};

export const getPubKeyPoint = (bn: BN, keyType: KeyType): Point => {
  const pubKeyEc = getPubKeyEC(bn, keyType);
  return new Point(pubKeyEc.getX().toString("hex"), pubKeyEc.getY().toString("hex"), keyType);
};
