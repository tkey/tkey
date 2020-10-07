import BN from "bn.js";
import { BNString, ISerializable, StringifiedType } from "../baseTypes/commonTypes";
import Point from "./Point";
declare class PublicShare implements ISerializable {
    shareCommitment: Point;
    shareIndex: BN;
    constructor(shareIndex: BNString, shareCommitment: Point);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): PublicShare;
}
export default PublicShare;
declare type PublicShareShareIndexMap = {
    [shareIndex: string]: PublicShare;
};
export declare type PublicSharePolyIDShareIndexMap = {
    [polynomialID: string]: PublicShareShareIndexMap;
};
