import BN from "bn.js";

import { SecurityQuestionStoreArgs } from "../base/aggregateTypes";
import { PolynomialID } from "../base/commonTypes";
import PublicShare from "../base/PublicShare";

class SecurityQuestionStore {
  nonce: BN;

  shareIndex: BN;

  sqPublicShare: PublicShare;

  polynomialID: PolynomialID;

  questions: string;

  constructor({ nonce, shareIndex, sqPublicShare, polynomialID, questions }: SecurityQuestionStoreArgs) {
    this.nonce = new BN(nonce, "hex");
    this.shareIndex = new BN(shareIndex, "hex");
    this.sqPublicShare = new PublicShare(sqPublicShare.shareIndex, sqPublicShare.shareCommitment);
    this.polynomialID = polynomialID;
    this.questions = questions;
  }
}
export default SecurityQuestionStore;
