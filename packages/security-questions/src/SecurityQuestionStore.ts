import { ISerializable, PolynomialID, PublicShare, SecurityQuestionStoreArgs, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";

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

  toJSON(): StringifiedType {
    return {
      nonce: this.nonce.toString("hex"),
      shareIndex: this.shareIndex.toString("hex"),
      sqPublicShare: this.sqPublicShare,
      polynomialID: this.polynomialID.toString(),
      questions: this.questions,
    };
  }
}
export default SecurityQuestionStore;
