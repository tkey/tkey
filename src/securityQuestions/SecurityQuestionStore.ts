import BN from "bn.js";

import { PolynomialID, SecurityQuestionStoreArgs } from "../base/commonTypes";

class SecurityQuestionStore {
  nonce: BN;

  shareIndex: BN;

  polynomialID: PolynomialID;

  questions: string;

  constructor({ nonce, shareIndex, polynomialID, questions }: SecurityQuestionStoreArgs) {
    this.nonce = new BN(nonce, "hex");
    this.shareIndex = new BN(shareIndex, "hex");
    this.polynomialID = polynomialID;
    this.questions = questions;
  }
}
export default SecurityQuestionStore;
