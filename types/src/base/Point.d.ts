/// <reference types="node" />
import BN from "bn.js";
import { BNString, IPoint } from "./commonTypes";
declare class Point implements IPoint {
    x: BN;
    y: BN;
    constructor(x: BNString, y: BNString);
    encode(enc: "arr"): Buffer;
}
export default Point;
