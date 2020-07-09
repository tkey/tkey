import { PolynomialID } from "./commonTypes";
import Share from "./Share";

class ShareStore {
  share: Share;

  polynomialID: PolynomialID;

  constructor({ share, polynomialID }: ShareStore) {
    if (share instanceof Share && typeof polynomialID === "string") {
      this.share = share;
      this.polynomialID = polynomialID;
    } else if (typeof share === "object" && typeof polynomialID === "string") {
      if (!("share" in share) || !("shareIndex" in share)) {
        throw new TypeError("expected ShareStore input share to have share and shareIndex");
      }
      this.share = new Share(share.shareIndex, share.share);
      this.polynomialID = polynomialID;
    } else {
      throw new TypeError("expected ShareStore inputs to be Share and string");
    }
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
