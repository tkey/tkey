/// <reference types="node" />
import BN from "bn.js";
import { curve, ec } from "elliptic";
import { BNString } from "./commonTypes";
import Point from "./Point";
declare const toPrivKeyEC: (bn: BN) => ec.KeyPair;
declare const toPrivKeyECC: (bn: BNString) => Buffer;
declare const getPubKeyEC: (bn: BN) => curve.base.BasePoint;
declare const getPubKeyECC: (bn: BN) => Buffer;
declare const getPubKeyPoint: (bn: BN) => Point;
export { toPrivKeyEC, toPrivKeyECC, getPubKeyEC, getPubKeyECC, getPubKeyPoint };
