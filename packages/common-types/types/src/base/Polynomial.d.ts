import BN from "bn.js";
import { BNString, ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import PublicPolynomial from "./PublicPolynomial";
import Share from "./Share";
export declare type ShareMap = {
    [x: string]: Share;
};
declare class Polynomial implements ISerializable {
    polynomial: BN[];
    publicPolynomial: PublicPolynomial;
    constructor(polynomial: BN[]);
    getThreshold(): number;
    polyEval(x: BNString): BN;
    generateShares(shareIndexes: BNString[]): ShareMap;
    getPublicPolynomial(): PublicPolynomial;
    getPolynomialID(): PolynomialID;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): Polynomial;
}
export default Polynomial;
