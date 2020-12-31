/// <reference types="node" />
import BN from "bn.js";
import { BNString } from "../baseTypes/commonTypes";
import Point from "./Point";
export declare const toPrivKeyEC: (bn: BN) => any;
export declare const toPrivKeyECC: (bn: BNString) => Buffer;
export declare const getPubKeyEC: (bn: BN) => any;
export declare const getPubKeyECC: (bn: BN) => Buffer;
export declare const getPubKeyPoint: (bn: BN) => Point;
