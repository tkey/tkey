import { PolynomialID } from "./commonTypes";
import Share from "./Share";

interface ShareStore {
  share: Share;
  polynomialID: PolynomialID;
}

class ShareStore {
  constructor({ share, polynomialID }: ShareStore) {
    this.share = share;
    this.polynomialID = polynomialID;
  }
}

export default ShareStore;
