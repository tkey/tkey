import BN from "bn.js";

import { getPubKeyPoint } from "./BNUtils";
import { BNString } from "./commonTypes";
import PublicShare from "./PublicShare";

class Share {
  share: BN;

  shareIndex: BN;

  constructor(shareIndex: BNString, share: BNString) {
    this.share = new BN(share, "hex");
    this.shareIndex = new BN(shareIndex, "hex");
  }

  getPublicShare(): PublicShare {
    return new PublicShare(this.shareIndex, getPubKeyPoint(this.share));
  }
}

export default Share;
