import stringify from "json-stable-stringify";

import {
  Point,
  Polynomial,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  ScopedStore,
  Share,
  ShareMap,
  ShareStore,
} from "./base";
import { IMetadata } from "./baseTypes/aggregateTypes";
import { PolynomialID, ShareDescriptionMap, StringifiedType } from "./baseTypes/commonTypes";

class Metadata implements IMetadata {
  pubKey: Point;

  publicPolynomials: PublicPolynomialMap;

  publicShares: PublicSharePolyIDShareIndexMap;

  shareDescriptions: ShareDescriptionMap;

  polyIDList: PolynomialID[];

  generalStore: {
    [moduleName: string]: unknown;
  };

  tkeyStore: {
    [moduleName: string]: unknown;
  };

  scopedStore: ScopedStore;

  constructor(input: Point) {
    this.publicPolynomials = {};
    this.publicShares = {};
    this.generalStore = {};
    this.tkeyStore = {};
    this.shareDescriptions = {};
    this.pubKey = input;
    this.polyIDList = [];
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

  setTkeyStoreDomain(key: string, obj: unknown): void {
    this.tkeyStore[key] = obj;
  }

  getTkeyStoreDomain(key: string): unknown {
    return this.tkeyStore[key];
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
        if (Object.prototype.hasOwnProperty.call(shares, k)) {
          this.addPublicShare(publicPolynomial.getPolynomialID(), shares[k].getPublicShare());
        }
      }
    }
  }

  setScopedStore(scopedStore: ScopedStore): void {
    this.scopedStore = scopedStore;
  }

  getEncryptedShare(): ShareStore {
    return this.scopedStore.encryptedShare;
  }

  getShareDescription(): ShareDescriptionMap {
    return this.shareDescriptions;
  }

  addShareDescription(shareIndex: string, description: string): void {
    if (this.shareDescriptions[shareIndex]) {
      this.shareDescriptions[shareIndex].push(description);
    } else {
      this.shareDescriptions[shareIndex] = [description];
    }
  }

  deleteShareDescription(shareIndex: string, description: string): void {
    const index = this.shareDescriptions[shareIndex].indexOf(description);
    if (index > -1) {
      this.shareDescriptions[shareIndex].splice(index, 1);
    }
  }

  clone(): Metadata {
    return Metadata.fromJSON(JSON.parse(stringify(this)));
  }

  toJSON(): StringifiedType {
    return this;
  }

  static fromJSON(value: StringifiedType): Metadata {
    const { pubKey, polyIDList, generalStore, tkeyStore, scopedStore, shareDescriptions, publicPolynomials, publicShares } = value;
    const point = new Point(pubKey.x, pubKey.y);
    const metadata = new Metadata(point);
    metadata.polyIDList = polyIDList;
    if (generalStore) metadata.generalStore = generalStore;
    if (tkeyStore) metadata.tkeyStore = tkeyStore;
    if (scopedStore) metadata.scopedStore = scopedStore;
    if (shareDescriptions) metadata.shareDescriptions = shareDescriptions;

    // for publicPolynomials
    for (const pubPolyID in publicPolynomials) {
      if (Object.prototype.hasOwnProperty.call(publicPolynomials, pubPolyID)) {
        const pointCommitments = [];
        publicPolynomials[pubPolyID].polynomialCommitments.forEach((commitment) => {
          pointCommitments.push(new Point(commitment.x, commitment.y));
        });
        const publicPolynomial = new PublicPolynomial(pointCommitments);
        metadata.publicPolynomials[pubPolyID] = publicPolynomial;
      }
    }
    // for publicShares
    for (const pubPolyID in publicShares) {
      if (Object.prototype.hasOwnProperty.call(publicShares, pubPolyID)) {
        for (const shareIndex in publicShares[pubPolyID]) {
          if (Object.prototype.hasOwnProperty.call(publicShares[pubPolyID], shareIndex)) {
            const newPubShare = new PublicShare(
              publicShares[pubPolyID][shareIndex].shareIndex,
              new Point(publicShares[pubPolyID][shareIndex].shareCommitment.x, publicShares[pubPolyID][shareIndex].shareCommitment.y)
            );
            metadata.addPublicShare(pubPolyID, newPubShare);
          }
        }
      }
    }
    return metadata;
  }
}

export default Metadata;
