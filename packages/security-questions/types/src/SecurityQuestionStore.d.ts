import { ISerializable, PolynomialID, PublicShare, SecurityQuestionStoreArgs, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";
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
