/* eslint-disable guard-for-in */
import { PolynomialID } from "./base/commonTypes";
import Point from "./base/Point";
import { Polynomial, ShareMap } from "./base/Polynomial";
import PublicPolynomial, { PublicPolynomialMap } from "./base/PublicPolynomial";
import PublicShare, { PublicSharePolyIDShareIndexMap } from "./base/PublicShare";
import Share from "./base/Share";
import ShareStore from "./base/ShareStore";

type ScopedStore = {
  encryptedShare: ShareStore;
};

class Metadata {
  pubKey: Point;

  publicPolynomials: PublicPolynomialMap;

  publicShares: PublicSharePolyIDShareIndexMap;

  polyIDList: Array<PolynomialID>;

  generalStore: {
    [moduleName: string]: unknown;
  };

  scopedStore: ScopedStore;

  constructor(input) {
    if (input instanceof Point) {
      this.pubKey = input;
      this.publicPolynomials = {};
      this.publicShares = {};
      this.polyIDList = [];
      this.generalStore = {};
    } else if (typeof input === "object") {
      // assumed to be JSON.parsed object
      this.pubKey = new Point(input.pubKey.x, input.pubKey.y);
      this.publicPolynomials = {};
      this.publicShares = {};
      this.polyIDList = input.polyIDList;
      this.generalStore = {};
      if (input.generalStore) this.generalStore = input.generalStore;
      if (input.scopedStore) this.scopedStore = input.scopedStore;
      // for publicPolynomials
      for (const pubPolyID in input.publicPolynomials) {
        const pointCommitments = [];
        input.publicPolynomials[pubPolyID].polynomialCommitments.forEach((commitment) => {
          pointCommitments.push(new Point(commitment.x, commitment.y));
        });
        const publicPolynomial = new PublicPolynomial(pointCommitments);
        this.publicPolynomials[pubPolyID] = publicPolynomial;
      }
      // for publicShares
      for (const pubPolyID in input.publicShares) {
        for (const shareIndex in input.publicShares[pubPolyID]) {
          const newPubShare = new PublicShare(
            input.publicShares[pubPolyID][shareIndex].shareIndex,
            new Point(input.publicShares[pubPolyID][shareIndex].shareCommitment.x, input.publicShares[pubPolyID][shareIndex].shareCommitment.y)
          );
          this.addPublicShare(pubPolyID, newPubShare);
        }
      }
    } else {
      throw TypeError("not a valid constructor argument for Metadata");
    }
  }

  getShareIndexesForPolynomial(polyID: PolynomialID): Array<string> {
    return Object.keys(this.publicShares[polyID]);
  }

  getLatestPublicPolynomial(): PublicPolynomial {
    return this.publicPolynomials[this.polyIDList[this.polyIDList.length - 1]];
  }

  addPublicPolynomial(publicPolynomial: PublicPolynomial): void {
    const polyID = publicPolynomial.getPolynomialID();
    this.publicPolynomials[polyID] = publicPolynomial;
    this.polyIDList.push(polyID);
  }

  addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void {
    if (!(polynomialID in this.publicShares)) {
      this.publicShares[polynomialID] = {};
    }
    this.publicShares[polynomialID][publicShare.shareIndex.toString("hex")] = publicShare;
  }

  setGeneralStoreDomain(key: string, obj: unknown): void {
    this.generalStore[key] = obj;
  }

  getGeneralStoreDomain(key: string): unknown {
    return this.generalStore[key];
  }

  addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void {
    const publicPolynomial = polynomial.getPublicPolynomial();
    this.addPublicPolynomial(publicPolynomial);
    if (Array.isArray(shares)) {
      for (let i = 0; i < shares.length; i += 1) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[i].getPublicShare());
      }
    } else {
      for (const k in shares) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[k].getPublicShare());
      }
    }
  }

  setScopedStore(scopedStore: ScopedStore): void {
    this.scopedStore = scopedStore;
  }

  getEncryptedShare(): ShareStore {
    return this.scopedStore.encryptedShare;
  }

  clone(): Metadata {
    return new Metadata(JSON.parse(JSON.stringify(this)));
  }
}

export default Metadata;
