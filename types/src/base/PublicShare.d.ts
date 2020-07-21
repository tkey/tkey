import BN from "bn.js";
import { BNString } from "./commonTypes";
import Point from "./Point";
export declare type PublicSharePolyIDShareIndexMap = {
    [polynomialID: string]: PublicShareShareIndexMap;
};
declare type PublicShareShareIndexMap = {
    [shareIndex: string]: PublicShare;
};
declare class PublicShare {
    shareCommitment: Point;
    shareIndex: BN;
    constructor(shareIndex: BNString, shareCommitment: Point);
}
export default PublicShare;
