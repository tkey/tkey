import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import Point from "./Point";
declare class PublicPolynomial implements ISerializable {
    polynomialCommitments: Point[];
    constructor(polynomialCommitments: Point[]);
    getThreshold(): number;
    getPolynomialID(): PolynomialID;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): PublicPolynomial;
}
export declare type PublicPolynomialMap = {
    [polynomialID: string]: PublicPolynomial;
};
export default PublicPolynomial;
