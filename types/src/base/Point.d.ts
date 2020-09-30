/// <reference types="node" />
import BN from "bn.js";
import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";
declare class Point implements IPoint {
    x: BN;
    y: BN;
    constructor(x: BNString, y: BNString);
    encode(enc: string, params?: any): Buffer;
    toJSON(): StringifiedType;
    static fromCompressedPub(value: string): Point;
    static fromJSON(value: StringifiedType): Point;
}
export default Point;
