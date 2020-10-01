import BN from "bn.js";
import { PublicShare } from "../base";
import { SecurityQuestionStoreArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
declare class SecurityQuestionStore implements ISerializable {
    nonce: BN;
    shareIndex: BN;
    sqPublicShare: PublicShare;
    polynomialID: PolynomialID;
    questions: string;
    constructor({ nonce, shareIndex, sqPublicShare, polynomialID, questions }: SecurityQuestionStoreArgs);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): SecurityQuestionStore;
}
export default SecurityQuestionStore;
