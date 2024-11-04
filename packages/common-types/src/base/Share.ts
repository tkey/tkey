import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";
import { bigIntToHex, HexString, prefix0x } from "../utils";
import Point, { curveType } from "./Point";
import PublicShare from "./PublicShare";

class Share implements ISerializable {
  share: bigint;

  shareIndex: bigint;

  constructor(shareIndex: bigint, share: bigint) {
    this.share = share;
    this.shareIndex = shareIndex;
  }

  static fromHex(shareIndex: HexString, share: HexString): Share {
    return new Share(BigInt(shareIndex), BigInt(share));
  }

  static fromJSON(value: StringifiedType): Share {
    const { share, shareIndex } = value;
    return Share.fromHex(prefix0x(shareIndex), prefix0x(share));
  }

  getPublicShare(): PublicShare {
    return new PublicShare(this.shareIndex, Point.fromScalar(curveType.secp256k1, bigIntToHex(this.share)));
  }

  toJSON(): StringifiedType {
    return {
      share: this.share.toString(16),
      shareIndex: this.shareIndex.toString(16),
    };
  }
}

export default Share;
