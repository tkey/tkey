import BN from "bn.js";
import stringify from "json-stable-stringify";

import {
  Point,
  Polynomial,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  Share,
  ShareMap,
  ShareStore,
  toPrivKeyECC,
} from "./base";
import { IMetadata } from "./baseTypes/aggregateTypes";
import { EncryptedMessage, PolynomialID, ShareDescriptionMap, StringifiedType } from "./baseTypes/commonTypes";
import { polyCommitmentEval } from "./lagrangeInterpolatePolynomial";
import { decrypt, ecCurve } from "./utils";

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

  scopedStore: {
    [moduleName: string]: unknown;
  };

  constructor(input: Point) {
    this.publicPolynomials = {};
    this.publicShares = {};
    this.generalStore = {};
    this.tkeyStore = {};
    this.scopedStore = {};
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

  addFromPolynomialAndShares(polynomial: Polynomial, shares: Share[] | ShareMap): void {
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

  setScopedStore(domain: string, data: unknown): void {
    this.scopedStore[domain] = data;
  }

  async getEncryptedShare(shareStore: ShareStore): Promise<ShareStore> {
    const pubShare = shareStore.share.getPublicShare();
    const encryptedShareStore = this.scopedStore.encryptedShares;
    if (!encryptedShareStore) {
      throw new Error(`no encrypted share store for share exists:  ${shareStore}`);
    }
    const encryptedShare = encryptedShareStore[pubShare.shareCommitment.x.toString("hex")];
    if (!encryptedShare) {
      throw new Error(`no encrypted share for share store exists:  ${shareStore}`);
    }
    const rawDecrypted = await decrypt(toPrivKeyECC(shareStore.share.share), encryptedShare as EncryptedMessage);
    return ShareStore.fromJSON(JSON.parse(rawDecrypted.toString()));
  }

  getShareDescription(): ShareDescriptionMap {
    return this.getGeneralStoreDomain("shareDescriptions") as ShareDescriptionMap;
  }

  addShareDescription(shareIndex: string, description: string): void {
    const currentSD = this.getGeneralStoreDomain("shareDescriptions") || {};
    if (currentSD[shareIndex]) {
      currentSD[shareIndex].push(description);
    } else {
      currentSD[shareIndex] = [description];
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
    // squash data to serialized polyID according to spec
    const serializedPolyIDList = [];
    for (let i = 0; i < this.polyIDList.length; i += 1) {
      const polyID = this.polyIDList[i];
      const shareIndexes = Object.keys(this.publicShares[polyID]);
      const sortedShareIndexes = shareIndexes.sort((a: string, b: string) => {
        return new BN(a, "hex").cmp(new BN(b, "hex"));
      });
      const serializedPolyID = polyID
        .split(`|`)
        .concat("0x0")
        .concat(...sortedShareIndexes)
        .join("|");
      serializedPolyIDList.push(serializedPolyID);
    }

    // cater to sharedescriptions being out of general store
    const generalStoreCopy = JSON.parse(JSON.stringify(this.generalStore));
    generalStoreCopy.shareDescriptions = this.shareDescriptions;

    return {
      pubKey: this.pubKey.encode("elliptic-compressed", { ec: ecCurve }).toString(),
      polyIDList: serializedPolyIDList,
      scopedStore: this.scopedStore,
      generalStore: generalStoreCopy,
      tkeyStore: this.tkeyStore,
    };
  }

  static fromJSON(value: StringifiedType): Metadata {
    const { pubKey, polyIDList, generalStore, tkeyStore, scopedStore } = value;
    const point = Point.fromCompressedPub(pubKey);
    const metadata = new Metadata(point);
    const unserializedPolyIDList = [];

    if (generalStore) metadata.generalStore = generalStore;
    if (tkeyStore) metadata.tkeyStore = tkeyStore;
    if (scopedStore) metadata.scopedStore = scopedStore;
    if (generalStore.shareDescriptions) metadata.shareDescriptions = generalStore.shareDescriptions; // cater to shareDescriptions

    for (let i = 0; i < polyIDList.length; i += 1) {
      const serializedPolyID = polyIDList[i];
      const arrPolyID = serializedPolyID.split("|");
      const firstHalf = arrPolyID.slice(
        0,
        arrPolyID.findIndex((v) => {
          return v === "0x0";
        })
      );
      const secondHalf = arrPolyID.slice(
        arrPolyID.findIndex((v) => {
          return v === "0x0";
        }) + 1,
        arrPolyID.length
      );
      // for publicPolynomials
      const pubPolyID = firstHalf.join("|");
      const pointCommitments = [];
      firstHalf.forEach((compressedCommitment) => {
        pointCommitments.push(Point.fromCompressedPub(compressedCommitment));
      });
      const publicPolynomial = new PublicPolynomial(pointCommitments);
      metadata.publicPolynomials[pubPolyID] = publicPolynomial;

      // for publicShares
      secondHalf.forEach((shareIndex) => {
        const newPubShare = new PublicShare(shareIndex, polyCommitmentEval(publicPolynomial.polynomialCommitments, new BN(shareIndex, "hex")));
        metadata.addPublicShare(pubPolyID, newPubShare);
      });

      // for polyIDList
      unserializedPolyIDList.push(pubPolyID);
    }

    metadata.polyIDList = unserializedPolyIDList;
    return metadata;
  }
}

export default Metadata;
