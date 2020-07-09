import { PolynomialID } from "./commonTypes";
import Share from "./Share";

class ShareStore {
  share: Share;

  polynomialID: PolynomialID;

  constructor({ share, polynomialID }: ShareStore) {
    this.share = share;
    this.polynomialID = polynomialID;
  }
}

export type ShareStorePolyIDShareIndexMap = {
  [polynomialID: string]: ShareStoreMap;
};

// @flow
export type ShareStoreMap = {
  [shareIndex: string]: ShareStore;
};

export default ShareStore;
