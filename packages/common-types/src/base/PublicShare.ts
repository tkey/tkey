import BN from "bn.js";

import { BNString, ISerializable, StringifiedType } from "../baseTypes/commonTypes";
import Point from "./Point";

class PublicShare implements ISerializable {
  shareCommitment: Point;

  shareIndex: BN;

  constructor(shareIndex: BNString, shareCommitment: Point) {
    this.shareCommitment = new Point(shareCommitment.x, shareCommitment.y);
    this.shareIndex = new BN(shareIndex, "hex");
  }

  static fromJSON(value: StringifiedType): PublicShare {
    const { shareCommitment, shareIndex } = value;
    return new PublicShare(shareIndex, Point.fromJSON(shareCommitment));
  }

  toJSON(): StringifiedType {
    return {
      shareCommitment: this.shareCommitment,
      shareIndex: this.shareIndex.toString("hex"),
    };
  }
}

export default PublicShare;

type PublicShareShareIndexMap = {
  [shareIndex: string]: PublicShare;
};

// @flow
export type PublicSharePolyIDShareIndexMap = {
  [polynomialID: string]: PublicShareShareIndexMap;
};
