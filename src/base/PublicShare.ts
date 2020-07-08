import BN from "bn.js";

import { BNString } from "./commonTypes";
import Point from "./Point";

class PublicShare {
  shareCommitment: Point;

  shareIndex: BN;

  constructor(shareIndex: BNString, shareCommitment: Point) {
    this.shareCommitment = shareCommitment;
    this.shareIndex = new BN(shareIndex, "hex");
  }
}

export default PublicShare;
