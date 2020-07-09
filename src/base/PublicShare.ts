import BN from "bn.js";

import { BNString } from "./commonTypes";
import Point from "./Point";

// @flow
export type PublicSharePolyIDShareIndexMap = {
  [polynomialID: string]: PublicShareShareIndexMap;
};

type PublicShareShareIndexMap = {
  [shareIndex: string]: PublicShare;
};

class PublicShare {
  shareCommitment: Point;

  shareIndex: BN;

  constructor(shareIndex: BNString, shareCommitment: Point) {
    this.shareCommitment = shareCommitment;
    this.shareIndex = new BN(shareIndex, "hex");
  }
}

export default PublicShare;
