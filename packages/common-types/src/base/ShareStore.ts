import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import Share from "./Share";

class ShareStore implements ISerializable {
  share: Share;

  polynomialID: PolynomialID;

  tssShare?: Share;

  constructor(share: Share, polynomialID: PolynomialID, tssShare?: Share) {
    this.share = share;
    this.polynomialID = polynomialID;
    this.tssShare = tssShare;
  }

  static fromJSON(value: StringifiedType): ShareStore {
    const { share, polynomialID, tssShare } = value;
    if (tssShare) {
      return new ShareStore(Share.fromJSON(share), polynomialID, Share.fromJSON(tssShare));
    }
    return new ShareStore(Share.fromJSON(share), polynomialID);
  }

  toJSON(): StringifiedType {
    return {
      share: this.share,
      polynomialID: this.polynomialID.toString(),
      tssShare: this.tssShare,
    };
  }
}

export type EncryptedShareStore = {
  [shareCommitment: string]: ShareStore;
};

// @flow
export type ShareStoreMap = {
  [shareIndex: string]: ShareStore;
};

export type ShareStorePolyIDShareIndexMap = {
  [polynomialID: string]: ShareStoreMap;
};

export default ShareStore;
