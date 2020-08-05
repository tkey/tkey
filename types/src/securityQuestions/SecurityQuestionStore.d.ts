import BN from "bn.js";
import { SecurityQuestionStoreArgs } from "../base/aggregateTypes";
import { PolynomialID } from "../base/commonTypes";
import PublicShare from "../base/PublicShare";
declare class SecurityQuestionStore {
    nonce: BN;
    shareIndex: BN;
    sqPublicShare: PublicShare;
    polynomialID: PolynomialID;
    questions: string;
    constructor({ nonce, shareIndex, sqPublicShare, polynomialID, questions }: SecurityQuestionStoreArgs);
}
export default SecurityQuestionStore;
