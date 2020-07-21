import BN from "bn.js";
import { BNString, PolynomialID } from "./commonTypes";
import PublicPolynomial from "./PublicPolynomial";
import Share from "./Share";
export declare type ShareMap = {
    [x: string]: Share;
};
declare class Polynomial {
    polynomial: Array<BN>;
    constructor(polynomial: Array<BN>);
    getThreshold(): number;
    polyEval(x: BNString): BN;
    generateShares(shareIndexes: Array<BNString>): ShareMap;
    getPublicPolynomial(): PublicPolynomial;
    getPolynomialID(): PolynomialID;
}
export { Polynomial, PublicPolynomial };
