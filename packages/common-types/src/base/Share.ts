import BN from "bn.js";

import { BNString, ISerializable, KeyType, StringifiedType } from "../baseTypes/commonTypes";
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

  getPublicShare(keyType: KeyType): PublicShare {
    const pubKeyPoint = getPubKeyPoint(this.share, keyType);
    return new PublicShare(this.shareIndex, pubKeyPoint, keyType);
  }

  toJSON(): StringifiedType {
    return {
      share: this.share.toString("hex"),
      shareIndex: this.shareIndex.toString("hex"),
    };
  }
}

export default Share;
