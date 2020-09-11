import { Point, Polynomial, PublicPolynomial, PublicPolynomialMap, PublicShare, PublicSharePolyIDShareIndexMap, ScopedStore, Share, ShareMap, ShareStore } from "./base";
import { IMetadata } from "./baseTypes/aggregateTypes";
import { PolynomialID, ShareDescriptionMap, StringifiedType } from "./baseTypes/commonTypes";
declare class Metadata implements IMetadata {
    pubKey: Point;
    publicPolynomials: PublicPolynomialMap;
    publicShares: PublicSharePolyIDShareIndexMap;
    shareDescriptions: ShareDescriptionMap;
    polyIDList: PolynomialID[];
    generalStore: {
        [moduleName: string]: unknown;
    };
    scopedStore: ScopedStore;
    constructor(input: Point);
    getShareIndexesForPolynomial(polyID: PolynomialID): Array<string>;
    getLatestPublicPolynomial(): PublicPolynomial;
    addPublicPolynomial(publicPolynomial: PublicPolynomial): void;
    addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
    setGeneralStoreDomain(key: string, obj: unknown): void;
    getGeneralStoreDomain(key: string): unknown;
    addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void;
    setScopedStore(scopedStore: ScopedStore): void;
    getEncryptedShare(): ShareStore;
    getShareDescription(): ShareDescriptionMap;
    addShareDescription(shareIndex: string, description: string): void;
    deleteShareDescription(shareIndex: string, description: string): void;
    clone(): Metadata;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): Metadata;
}
export default Metadata;
