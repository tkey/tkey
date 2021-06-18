import { IMetadata, Point, PolyIDAndShares, Polynomial, PolynomialID, PublicPolynomial, PublicPolynomialMap, PublicShare, PublicSharePolyIDShareIndexMap, Share, ShareDescriptionMap, ShareMap, ShareStore, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";
declare class Metadata implements IMetadata {
    pubKey: Point;
    publicPolynomials: PublicPolynomialMap;
    publicShares: PublicSharePolyIDShareIndexMap;
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
    constructor(input: Point);
    getShareIndexesForPolynomial(polyID: PolynomialID): Array<string>;
    getLatestPublicPolynomial(): PublicPolynomial;
    addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
    setGeneralStoreDomain(key: string, obj: unknown): void;
    getGeneralStoreDomain(key: string): unknown;
    deleteGeneralStoreDomain(key: string): void;
    setTkeyStoreDomain(key: string, arr: unknown): void;
    getTkeyStoreDomain(key: string): unknown;
    addFromPolynomialAndShares(polynomial: Polynomial, shares: Share[] | ShareMap): void;
    setScopedStore(domain: string, data: unknown): void;
    getEncryptedShare(shareStore: ShareStore): Promise<ShareStore>;
    getShareDescription(): ShareDescriptionMap;
    addShareDescription(shareIndex: string, description: string): void;
    deleteShareDescription(shareIndex: string, description: string): void;
    shareToShareStore(share: BN): ShareStore;
    clone(): Metadata;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): Metadata;
}
export default Metadata;
