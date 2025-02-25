import {
  decrypt,
  EncryptedMessage,
  FactorEnc,
  getPubKeyPoint,
  IMetadata,
  ITssMetadata,
  KeyType,
  Point,
  PolyIDAndShares,
  Polynomial,
  PolynomialID,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  secp256k1,
  Share,
  ShareDescriptionMap,
  ShareMap,
  ShareStore,
  StringifiedType,
  toPrivKeyECC,
} from "@tkey/common-types";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import CoreError from "./errors";
import { polyCommitmentEval } from "./lagrangeInterpolatePolynomial";
import { TssMetadata } from "./tssMetadata";

export const LEGACY_METADATA_VERSION = "0.0.1";
export const METADATA_VERSION = "1.0.0";

export class Metadata implements IMetadata {
  pubKey: Point;

  publicPolynomials: PublicPolynomialMap;

  publicShares: PublicSharePolyIDShareIndexMap;

  // Tuple of PolyID and array of ShareIndexes
  polyIDList: PolyIDAndShares[];

  generalStore: {
    [moduleName: string]: unknown;
  };

  tkeyStore: {
    [moduleName: string]: unknown;
  };

  scopedStore: {
    [moduleName: string]: unknown;
  };

  nonce: number;

  tss?: {
    [tssTag: string]: {
      [curveType: string]: TssMetadata;
    };
  };

  version = METADATA_VERSION;

  constructor(input: Point) {
    this.publicPolynomials = {};
    this.publicShares = {};
    this.generalStore = {};
    this.tkeyStore = {};
    this.scopedStore = {};
    this.pubKey = input;
    this.polyIDList = [];
    this.nonce = 0;
  }

  static fromJSON(value: StringifiedType): Metadata {
    const {
      pubKey,
      polyIDList,
      generalStore,
      tkeyStore,
      scopedStore,
      nonce,
      tss,
      version,
      // v0 metadata
      tssKeyTypes: tssKeyTypesJson,
      tssPolyCommits,
      tssNonces,
      factorPubs,
      factorEncs,
    } = value;
    const point = Point.fromSEC1(secp256k1, pubKey);
    const metadata = new Metadata(point);

    const unserializedPolyIDList: PolyIDAndShares[] = [];

    if (generalStore) metadata.generalStore = generalStore;
    if (tkeyStore) metadata.tkeyStore = tkeyStore;
    if (scopedStore) metadata.scopedStore = scopedStore;
    if (nonce) metadata.nonce = nonce;

    if (version === METADATA_VERSION) {
      metadata.tss = {};

      if (tss) {
        Object.keys(tss).forEach((tsstag) => {
          if (tss[tsstag]) {
            metadata.tss[tsstag] = {};
            Object.keys(tss[tsstag]).forEach((tssKeyType) => {
              metadata.tss[tsstag][tssKeyType] = TssMetadata.fromJSON(tss[tsstag][tssKeyType]);
            });
          }
        });
      }

      // else would be legacy version, migrate for secp version
    } else if (factorEncs) {
      metadata.tss = {};
      // some tests case on backward compatbility tests having serialized metadata with empty tssKeyTypes
      const tssKeyTypes: Record<string, string> = tssKeyTypesJson ?? {};

      Object.keys(factorEncs).forEach((tssTag) => {
        // incase fo tssKeyType is empty, then fill it with secp256k1
        const tssKeyType = tssKeyTypes[tssTag] ?? KeyType.secp256k1;

        if (tssKeyType === KeyType.ed25519) {
          throw new Error(`ed25519 is not supported for migration for metadata from v${version ?? LEGACY_METADATA_VERSION} to ${METADATA_VERSION}`);
        }
        metadata.tss[tssTag] = {
          [tssKeyType]: TssMetadata.fromJSON({
            tssTag,
            tssKeyType,
            tssNonce: tssNonces[tssTag],
            tssPolyCommits: tssPolyCommits[tssTag],
            factorPubs: factorPubs[tssTag],
            factorEncs: factorEncs[tssTag],
          }),
        };
      });
    }
    // updated to latest version since using latest Metadata deserialization
    metadata.version = METADATA_VERSION;

    for (let i = 0; i < polyIDList.length; i += 1) {
      const serializedPolyID: string = polyIDList[i];
      const arrPolyID = serializedPolyID.split("|");
      const zeroIndex = arrPolyID.findIndex((v) => v === "0x0");
      const firstHalf = arrPolyID.slice(0, zeroIndex);
      const secondHalf = arrPolyID.slice(zeroIndex + 1, arrPolyID.length);
      // for publicPolynomials
      const pubPolyID = firstHalf.join("|");
      const pointCommitments: Point[] = [];
      firstHalf.forEach((compressedCommitment) => {
        pointCommitments.push(Point.fromCompressedPub(compressedCommitment));
      });
      const publicPolynomial = new PublicPolynomial(pointCommitments);
      metadata.publicPolynomials[pubPolyID] = publicPolynomial;

      // for polyIDList
      unserializedPolyIDList.push([pubPolyID, secondHalf]);
    }

    metadata.polyIDList = unserializedPolyIDList;
    return metadata;
  }

  getShareIndexesForPolynomial(polyID: PolynomialID): Array<string> {
    const matchingPolyIDs = this.polyIDList.filter((tuple) => tuple[0] === polyID);
    if (matchingPolyIDs.length < 1) {
      throw CoreError.default("there is no matching polyID");
    } else if (matchingPolyIDs.length > 1) {
      throw CoreError.default("there is more than one matching polyID");
    }
    return matchingPolyIDs[0][1];
  }

  getLatestPublicPolynomial(): PublicPolynomial {
    return this.publicPolynomials[this.polyIDList[this.polyIDList.length - 1][0]];
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

  deleteGeneralStoreDomain(key: string): void {
    delete this.generalStore[key];
  }

  setTkeyStoreDomain(key: string, arr: unknown): void {
    this.tkeyStore[key] = arr;
  }

  getTkeyStoreDomain(key: string): unknown {
    return this.tkeyStore[key];
  }

  // appends shares and public polynomial to metadata.
  // should represent a generation of share or edit of threshold
  addFromPolynomialAndShares(polynomial: Polynomial, shares: Share[] | ShareMap): void {
    const publicPolynomial = polynomial.getPublicPolynomial();
    const polyID = publicPolynomial.getPolynomialID();
    this.publicPolynomials[polyID] = publicPolynomial;

    const shareIndexArr = [];
    if (Array.isArray(shares)) {
      for (let i = 0; i < shares.length; i += 1) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[i].getPublicShare());
        shareIndexArr.push(shares[i].shareIndex.toString("hex"));
      }
    } else {
      for (const k in shares) {
        if (Object.prototype.hasOwnProperty.call(shares, k)) {
          this.addPublicShare(publicPolynomial.getPolynomialID(), shares[k].getPublicShare());
          shareIndexArr.push(shares[k].shareIndex.toString("hex"));
        }
      }
    }
    this.polyIDList.push([polyID, shareIndexArr]);
  }

  setScopedStore(domain: string, data: unknown): void {
    this.scopedStore[domain] = data;
  }

  async getEncryptedShare(shareStore: ShareStore): Promise<ShareStore> {
    const pubShare = shareStore.share.getPublicShare();
    const encryptedShareStore = this.scopedStore.encryptedShares as Record<string, unknown>;
    if (!encryptedShareStore) {
      throw CoreError.encryptedShareStoreUnavailable(`${shareStore}`);
    }
    const encryptedShare = encryptedShareStore[pubShare.shareCommitment.x.toString("hex")];
    if (!encryptedShare) {
      throw CoreError.encryptedShareStoreUnavailable(`${shareStore}`);
    }
    const rawDecrypted = await decrypt(toPrivKeyECC(shareStore.share.share), encryptedShare as EncryptedMessage);
    return ShareStore.fromJSON(JSON.parse(rawDecrypted.toString()));
  }

  getShareDescription(): ShareDescriptionMap {
    return this.getGeneralStoreDomain("shareDescriptions") as ShareDescriptionMap;
  }

  addShareDescription(shareIndex: string, description: string): void {
    const currentSD = (this.getGeneralStoreDomain("shareDescriptions") || {}) as Record<string, string[]>;
    if (currentSD[shareIndex]) {
      currentSD[shareIndex].push(description);
    } else {
      currentSD[shareIndex] = [description];
    }
    this.setGeneralStoreDomain("shareDescriptions", currentSD);
  }

  deleteShareDescription(shareIndex: string, description: string): void {
    const currentSD = this.getGeneralStoreDomain("shareDescriptions") as Record<string, string[]>;
    const index = currentSD[shareIndex].indexOf(description);
    if (index > -1) {
      currentSD[shareIndex].splice(index, 1);
    } else {
      throw CoreError.default(`No share description found for the given shareIndex: ${shareIndex} 
        and description: ${description}`);
    }
  }

  updateShareDescription(shareIndex: string, oldDescription: string, newDescription: string): void {
    const currentSD = this.getGeneralStoreDomain("shareDescriptions") as Record<string, string[]>;
    const index = currentSD[shareIndex].indexOf(oldDescription);
    if (index > -1) {
      currentSD[shareIndex][index] = newDescription;
    } else {
      throw CoreError.default(`No share description found for the given shareIndex:
        ${shareIndex} and description: ${oldDescription}`);
    }
  }

  shareToShareStore(share: BN): ShareStore {
    const pubkey = getPubKeyPoint(share);
    let returnShare: ShareStore;

    for (let i = this.polyIDList.length - 1; i >= 0; i -= 1) {
      const el = this.polyIDList[i][0];

      for (let t = 0; t < this.polyIDList[i][1].length; t += 1) {
        const shareIndex = this.polyIDList[i][1][t];
        // find pubshare in cache if its there
        let pubShare: PublicShare;
        if (this.publicShares[el]) {
          if (this.publicShares[el][shareIndex]) {
            pubShare = this.publicShares[el][shareIndex];
          }
        }

        // if not reconstruct
        if (!pubShare) {
          pubShare = new PublicShare(shareIndex, polyCommitmentEval(this.publicPolynomials[el].polynomialCommitments, new BN(shareIndex, "hex")));
        }
        if (pubShare.shareCommitment.x.eq(pubkey.x) && pubShare.shareCommitment.y.eq(pubkey.y)) {
          const tempShare = new Share(pubShare.shareIndex, share);
          return new ShareStore(tempShare, el);
        }
      }
    }
    if (!returnShare) {
      throw CoreError.fromCode(1307);
    }
    return returnShare;
  }

  clone(): Metadata {
    return Metadata.fromJSON(JSON.parse(stringify(this)));
  }

  toJSON(): StringifiedType {
    // squash data to serialized polyID according to spec
    const serializedPolyIDList = [];
    for (let i = 0; i < this.polyIDList.length; i += 1) {
      const polyID = this.polyIDList[i][0];
      const shareIndexes = this.polyIDList[i][1];
      const sortedShareIndexes = shareIndexes.sort((a: string, b: string) => new BN(a, "hex").cmp(new BN(b, "hex")));
      const serializedPolyID = polyID
        .split(`|`)
        .concat("0x0")
        .concat(...sortedShareIndexes)
        .join("|");
      serializedPolyIDList.push(serializedPolyID);
    }

    const jsonObject = {
      pubKey: this.pubKey.toSEC1(secp256k1, true).toString("hex"),
      polyIDList: serializedPolyIDList,
      scopedStore: this.scopedStore,
      generalStore: this.generalStore,
      tkeyStore: this.tkeyStore,
      nonce: this.nonce,
      // will be updated to current version
      version: METADATA_VERSION,
    };

    return Object.keys(this.tss ?? {}).length > 0 ? { ...jsonObject, tss: this.tss } : jsonObject;
  }

  /**
   * Updates the TSS metadata for the given tag.
   */
  updateTSSData(tssData: {
    tssTag: string;
    tssKeyType?: KeyType;
    tssNonce?: number;
    tssPolyCommits?: Point[];
    factorPubs?: Point[];
    factorEncs?: {
      [factorPubID: string]: FactorEnc;
    };
  }): void {
    const { tssKeyType, tssTag, tssNonce, tssPolyCommits, factorPubs, factorEncs } = tssData;
    if (!this.tss) this.tss = {};
    if (!this.tss[tssData.tssTag]) this.tss[tssData.tssTag] = {};
    if (!this.tss[tssData.tssTag][tssKeyType]) {
      this.tss[tssData.tssTag][tssKeyType] = new TssMetadata({ tssTag, tssKeyType, tssNonce, tssPolyCommits, factorPubs, factorEncs });
    }
    if (tssData.tssKeyType === KeyType.ed25519) this.tss[tssTag].ed25519.update(tssData);
    else if (tssData.tssKeyType === KeyType.secp256k1) this.tss[tssTag].secp256k1.update(tssData);
  }

  getTssData(tssKeyType: KeyType, tssTag: string): ITssMetadata {
    // const tssDataList = this.tss?[tssTag];
    if (!this.tss) return undefined;
    if (!this.tss[tssTag]) return undefined;

    if (tssKeyType === KeyType.secp256k1) {
      return this.tss[tssTag].secp256k1;
    } else if (tssKeyType === KeyType.ed25519) {
      return this.tss[tssTag].ed25519;
    }
    return undefined;
  }
}

export class LegacyMetadata extends Metadata {
  version = LEGACY_METADATA_VERSION;

  static fromJSON(value: StringifiedType): LegacyMetadata {
    const {
      pubKey,
      polyIDList,
      generalStore,
      tkeyStore,
      scopedStore,
      nonce,
      version,
      // v0 metadata

      tssKeyTypes: tssKeyTypesJson,
      tssPolyCommits,
      tssNonces,
      factorPubs,
      factorEncs,
    } = value;
    const point = Point.fromSEC1(secp256k1, pubKey);
    const metadata = new LegacyMetadata(point);

    metadata.version = version || LEGACY_METADATA_VERSION;

    if (metadata.version !== LEGACY_METADATA_VERSION) {
      throw new Error(`Incompatible version, version ${metadata.version} is not supported in current configuration`);
    }

    const unserializedPolyIDList: PolyIDAndShares[] = [];

    if (generalStore) metadata.generalStore = generalStore;
    if (tkeyStore) metadata.tkeyStore = tkeyStore;
    if (scopedStore) metadata.scopedStore = scopedStore;
    if (nonce) metadata.nonce = nonce;

    for (let i = 0; i < polyIDList.length; i += 1) {
      const serializedPolyID: string = polyIDList[i];
      const arrPolyID = serializedPolyID.split("|");
      const zeroIndex = arrPolyID.findIndex((v) => v === "0x0");
      const firstHalf = arrPolyID.slice(0, zeroIndex);
      const secondHalf = arrPolyID.slice(zeroIndex + 1, arrPolyID.length);
      // for publicPolynomials
      const pubPolyID = firstHalf.join("|");
      const pointCommitments: Point[] = [];
      firstHalf.forEach((compressedCommitment) => {
        pointCommitments.push(Point.fromCompressedPub(compressedCommitment));
      });
      const publicPolynomial = new PublicPolynomial(pointCommitments);
      metadata.publicPolynomials[pubPolyID] = publicPolynomial;

      // for polyIDList
      unserializedPolyIDList.push([pubPolyID, secondHalf]);
    }

    metadata.polyIDList = unserializedPolyIDList;

    // tss related data
    if (!factorEncs) return metadata;
    if (Object.keys(factorEncs).length === 0) return metadata;

    metadata.tss = {};
    // some tests case on backward compatbility tests having serialized metadata with empty tssKeyType
    const tssKeyTypes: Record<string, string> = tssKeyTypesJson ?? {};

    Object.keys(factorEncs).forEach((tssTag) => {
      // incase fo tssKeyType is empty, then fill it with secp256k1
      const tssKeyType = tssKeyTypes[tssTag] ?? KeyType.secp256k1;

      metadata.tss[tssTag] = {
        [tssKeyType]: TssMetadata.fromJSON({
          tssTag,
          tssKeyType,
          tssNonce: tssNonces[tssTag],
          tssPolyCommits: tssPolyCommits[tssTag],
          factorPubs: factorPubs[tssTag],
          factorEncs: factorEncs[tssTag],
        }),
      };
    });
    return metadata;
  }

  toJSON(): StringifiedType {
    // squash data to serialized polyID according to spec
    const serializedPolyIDList = [];
    for (let i = 0; i < this.polyIDList.length; i += 1) {
      const polyID = this.polyIDList[i][0];
      const shareIndexes = this.polyIDList[i][1];
      const sortedShareIndexes = shareIndexes.sort((a: string, b: string) => new BN(a, "hex").cmp(new BN(b, "hex")));
      const serializedPolyID = polyID
        .split(`|`)
        .concat("0x0")
        .concat(...sortedShareIndexes)
        .join("|");
      serializedPolyIDList.push(serializedPolyID);
    }

    const tsstags = Object.keys(this.tss ?? {});

    // return if tss data is not available
    if (tsstags.length <= 0) {
      return {
        pubKey: this.pubKey.toSEC1(secp256k1, true).toString("hex"),
        polyIDList: serializedPolyIDList,
        scopedStore: this.scopedStore,
        generalStore: this.generalStore,
        tkeyStore: this.tkeyStore,
        nonce: this.nonce,
      };
    }

    // if there is tssdata, try serialize to legacy format

    const tssKeyTypes: Record<string, KeyType> = {};
    const tssNonces: Record<string, number> = {};
    const tssPolyCommits: Record<string, StringifiedType> = {};
    const factorPubs: Record<string, StringifiedType> = {};
    const factorEncs: Record<string, Record<string, FactorEnc>> = {};

    tsstags.forEach((tag) => {
      const allTssData = this.tss[tag];
      const allKeyTypes = Object.keys(allTssData);
      if (allKeyTypes.length > 1) throw Error("Metadata Error: Do not support multicurve serialization");

      const tssData = this.getTssData(allKeyTypes[0] as KeyType, tag);
      tssKeyTypes[tag] = tssData.tssKeyType;
      tssNonces[tag] = tssData.tssNonce;
      tssPolyCommits[tag] = tssData.tssPolyCommits.map((pt) => pt.toJSON());
      factorPubs[tag] = tssData.factorPubs.map((pt) => pt.toJSON());
      factorEncs[tag] = tssData.factorEncs;
    });

    return {
      pubKey: this.pubKey.toSEC1(secp256k1, true).toString("hex"),
      polyIDList: serializedPolyIDList,
      scopedStore: this.scopedStore,
      generalStore: this.generalStore,
      tkeyStore: this.tkeyStore,
      nonce: this.nonce,
      tssKeyTypes,
      tssNonces,
      tssPolyCommits,
      factorPubs,
      factorEncs,
      // Legacy Metadata version
      // version: this.version,
    };
  }

  clone(): LegacyMetadata {
    return LegacyMetadata.fromJSON(JSON.parse(stringify(this)));
  }
}

export const createMetadataInstance = (legacyMetadataFlag: boolean, input: Point) =>
  legacyMetadataFlag ? new LegacyMetadata(input) : new Metadata(input);

export const createMetadataFromJson = (legacyMetadataFlag: boolean, args: StringifiedType) =>
  legacyMetadataFlag ? LegacyMetadata.fromJSON(args) : Metadata.fromJSON(args);

export default Metadata;
