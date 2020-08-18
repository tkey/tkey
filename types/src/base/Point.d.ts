/// <reference types="node" />
import BN from "bn.js";
import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";
declare class Point implements IPoint {
    x: BN;
    y: BN;
    constructor(x: BNString, y: BNString);
    encode(enc: "arr"): Buffer;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): Point;
}
export default Point;
