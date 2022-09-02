import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import Share from "./Share";

class ShareStore implements ISerializable {
  share: Share;

  polynomialID: PolynomialID;

  tssShare: Share;

  constructor(share: Share, polynomialID: PolynomialID, tssShare: Share) {
    this.share = share;
    this.polynomialID = polynomialID;
  }

  static fromJSON(value: StringifiedType): ShareStore {
    const { share, polynomialID, tssShare } = value;
    return new ShareStore(Share.fromJSON(share), polynomialID, Share.fromJSON(tssShare));
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
