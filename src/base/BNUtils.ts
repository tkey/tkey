import BN from "bn.js";
import { getPublic } from "eccrypto";
import { curve, ec } from "elliptic";

import { ecCurve } from "../utils";
import { BNString } from "./commonTypes";
import Point from "./Point";

// These functions are here because BN can't be extended
const toPrivKeyEC = (bn: BN): ec.KeyPair => {
  return ecCurve.keyFromPrivate(bn.toString("hex", 64));
};

const toPrivKeyECC = (bn: BNString): Buffer => {
  const tmp = new BN(bn, "hex");
  return Buffer.from(tmp.toString("hex", 64), "hex");
};

const getPubKeyEC = (bn: BN): curve.base.BasePoint => {
  return ecCurve.keyFromPrivate(bn.toString("hex", 64)).getPublic();
};

const getPubKeyECC = (bn: BN): Buffer => {
  return getPublic(toPrivKeyECC(bn));
};

const getPubKeyPoint = (bn: BN): Point => {
  return new Point(getPubKeyEC(bn).getX(), getPubKeyEC(bn).getY());
};

export { toPrivKeyEC, toPrivKeyECC, getPubKeyEC, getPubKeyECC, getPubKeyPoint };
