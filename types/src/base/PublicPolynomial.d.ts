import { PolynomialID } from "./commonTypes";
import Point from "./Point";
declare class PublicPolynomial {
    polynomialCommitments: Array<Point>;
    constructor(polynomialCommitments: Array<Point>);
    getThreshold(): number;
    getPolynomialID(): PolynomialID;
}
export declare type PublicPolynomialMap = {
    [polynomialID: string]: PublicPolynomial;
};
export default PublicPolynomial;
