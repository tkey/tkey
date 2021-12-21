import BN from "bn.js";

import { BNString, ISerializable, StringifiedType } from "../baseTypes/commonTypes";
import { getPubKeyPoint } from "./BNUtils";
import PublicShare from "./PublicShare";

class Share implements ISerializable {
  share: BN;

  shareIndex: BN;

  constructor(shareIndex: BNString, share: BNString) {
    this.share = new BN(share, "hex");
    this.shareIndex = new BN(shareIndex, "hex");
  }

  static fromJSON(value: StringifiedType): Share {
    const { share, shareIndex } = value;
    return new Share(shareIndex, share);
  }

  getPublicShare(): PublicShare {
    return new PublicShare(this.shareIndex, getPubKeyPoint(this.share));
  }

  toJSON(): StringifiedType {
    return {
      share: this.share.toString("hex"),
      shareIndex: this.shareIndex.toString("hex"),
    };
  }
}

export default Share;
