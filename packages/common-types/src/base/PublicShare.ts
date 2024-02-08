import BN from "bn.js";

import { BNString, ISerializable, KeyType, StringifiedType } from "../baseTypes/commonTypes";
import { Point } from "./Point";

class PublicShare implements ISerializable {
  shareCommitment: Point;

  shareIndex: BN;

  keyType: KeyType;

  constructor(shareIndex: BNString, shareCommitment: Point, keyType: KeyType) {
    this.shareCommitment = new Point(shareCommitment.x, shareCommitment.y, keyType);
    this.shareIndex = new BN(shareIndex, "hex");
    this.keyType = keyType;
  }

  static fromJSON(value: StringifiedType): PublicShare {
    const { shareCommitment, shareIndex, keyType } = value;

    let publicShare: PublicShare;
    if (keyType) {
      publicShare = new PublicShare(shareIndex, Point.fromJSON(shareCommitment), keyType);
    } else {
      publicShare = new PublicShare(shareIndex, Point.fromJSON(shareCommitment), KeyType.secp256k1);
    }
    return publicShare;
  }

  toJSON(): StringifiedType {
    return {
      shareCommitment: this.shareCommitment,
      shareIndex: this.shareIndex.toString("hex"),
      keyType: this.keyType.toString(),
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
