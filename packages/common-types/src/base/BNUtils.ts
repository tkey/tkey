// import { getPublic } from "@toruslabs/eccrypto";
// import BN from "bn.js";
// import { curve, ec as EllipticCurve } from "elliptic";

// import { BNString, KeyType } from "../baseTypes/commonTypes";
// import { Point } from "./Point";

// // These functions are here because BN can't be extended
// export const toPrivKeyEC = (bn: BN, ec: EllipticCurve): EllipticCurve.KeyPair => ec.keyFromPrivate(bn.toString("hex", 64));

// export const toPrivKeyECC = (bn: BNString): Buffer => {
//   const tmp = new BN(bn, "hex");
//   return Buffer.from(tmp.toString("hex", 64), "hex");
// };

// export const getPubKeyEC = (bn: BN, keyType: KeyType): curve.base.BasePoint => {
//   const ec = new EllipticCurve(keyType.toString());
//   return ec.keyFromPrivate(bn.toString("hex", 64)).getPublic();
// };

// export const getPubKeyECC = (bn: BN): Buffer => getPublic(toPrivKeyECC(bn));

// export const getPubKeyPoint = (bn: BN, keyType: KeyType): Point => {
//   const pubKeyEc = getPubKeyEC(bn, keyType);
//   return new Point(pubKeyEc.getX().toString("hex"), pubKeyEc.getY().toString("hex"), keyType);
// };
