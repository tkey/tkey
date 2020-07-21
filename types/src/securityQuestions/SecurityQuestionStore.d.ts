import BN from "bn.js";
import { PolynomialID, SecurityQuestionStoreArgs } from "../base/commonTypes";
declare class SecurityQuestionStore {
    nonce: BN;
    shareIndex: BN;
    polynomialID: PolynomialID;
    questions: string;
    constructor({ nonce, shareIndex, polynomialID, questions }: SecurityQuestionStoreArgs);
}
export default SecurityQuestionStore;
