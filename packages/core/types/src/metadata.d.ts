import {
  IMetadata,
  Point,
  Polynomial,
  PolynomialID,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  Share,
  ShareDescriptionMap,
  ShareMap,
  ShareStore,
  StringifiedType,
} from "@tkey/types";
declare class Metadata implements IMetadata {
  pubKey: Point;
  publicPolynomials: PublicPolynomialMap;
  publicShares: PublicSharePolyIDShareIndexMap;
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
  constructor(input: Point);
  getShareIndexesForPolynomial(polyID: PolynomialID): Array<string>;
  getLatestPublicPolynomial(): PublicPolynomial;
  addPublicPolynomial(publicPolynomial: PublicPolynomial): void;
  addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
  setGeneralStoreDomain(key: string, obj: unknown): void;
  getGeneralStoreDomain(key: string): unknown;
  setTkeyStoreDomain(key: string, obj: unknown): void;
  getTkeyStoreDomain(key: string): unknown;
  addFromPolynomialAndShares(polynomial: Polynomial, shares: Share[] | ShareMap): void;
  setScopedStore(domain: string, data: unknown): void;
  getEncryptedShare(shareStore: ShareStore): Promise<ShareStore>;
  getShareDescription(): ShareDescriptionMap;
  addShareDescription(shareIndex: string, description: string): void;
  deleteShareDescription(shareIndex: string, description: string): void;
  clone(): Metadata;
  toJSON(): StringifiedType;
  static fromJSON(value: StringifiedType): Metadata;
}
export default Metadata;
