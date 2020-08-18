import BN from "bn.js";
import { BNString, ISerializable, StringifiedType } from "../baseTypes/commonTypes";
import Point from "./Point";
export declare type PublicSharePolyIDShareIndexMap = {
    [polynomialID: string]: PublicShareShareIndexMap;
};
declare type PublicShareShareIndexMap = {
    [shareIndex: string]: PublicShare;
};
declare class PublicShare implements ISerializable {
    shareCommitment: Point;
    shareIndex: BN;
    constructor(shareIndex: BNString, shareCommitment: Point);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): PublicShare;
}
export default PublicShare;
