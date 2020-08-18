import BN from "bn.js";

import { PublicShare } from "../base";
import { SecurityQuestionStoreArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";

class SecurityQuestionStore implements ISerializable {
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

  toJSON(): StringifiedType {
    return {
      nonce: this.nonce.toString("hex"),
      shareIndex: this.shareIndex.toString("hex"),
      sqPublicShare: this.sqPublicShare,
      polynomialID: this.polynomialID.toString(),
      questions: this.questions,
    };
  }

  static fromJSON(value: StringifiedType): SecurityQuestionStore {
    const { nonce, shareIndex, sqPublicShare, polynomialID, questions } = value;
    return new SecurityQuestionStore({
      nonce: new BN(nonce, "hex"),
      shareIndex: new BN(shareIndex, "hex"),
      sqPublicShare: PublicShare.fromJSON(sqPublicShare),
      polynomialID,
      questions,
    });
  }
}
export default SecurityQuestionStore;
