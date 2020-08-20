import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import Share from "./Share";

class ShareStore implements ISerializable {
  share: Share;

  polynomialID: PolynomialID;

  constructor(share: Share, polynomialID: PolynomialID) {
    this.share = share;
    this.polynomialID = polynomialID;
  }

  toJSON(): StringifiedType {
    return {
      share: this.share,
      polynomialID: this.polynomialID.toString(),
    };
  }

  static fromJSON(value: StringifiedType): ShareStore {
    const { share, polynomialID } = value;
    return new ShareStore(Share.fromJSON(share), polynomialID);
  }
}

export type ScopedStore = {
  encryptedShare: ShareStore;
};

export type ShareStorePolyIDShareIndexMap = {
  [polynomialID: string]: ShareStoreMap;
};

// @flow
export type ShareStoreMap = {
  [shareIndex: string]: ShareStore;
};

export default ShareStore;
