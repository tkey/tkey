import { PolynomialID, ShareDescriptionMap } from "./base/commonTypes";
import Point from "./base/Point";
import { Polynomial, ShareMap } from "./base/Polynomial";
import PublicPolynomial, { PublicPolynomialMap } from "./base/PublicPolynomial";
import PublicShare, { PublicSharePolyIDShareIndexMap } from "./base/PublicShare";
import Share from "./base/Share";
import ShareStore, { ScopedStore } from "./base/ShareStore";
declare class Metadata {
    pubKey: Point;
    publicPolynomials: PublicPolynomialMap;
    publicShares: PublicSharePolyIDShareIndexMap;
    shareDescriptions: ShareDescriptionMap;
    polyIDList: Array<PolynomialID>;
    generalStore: {
        [moduleName: string]: unknown;
    };
    scopedStore: ScopedStore;
    constructor(input: any);
    getShareIndexesForPolynomial(polyID: PolynomialID): Array<string>;
    getLatestPublicPolynomial(): PublicPolynomial;
    addPublicPolynomial(publicPolynomial: PublicPolynomial): void;
    addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
    setGeneralStoreDomain(key: string, obj: unknown): void;
    getGeneralStoreDomain(key: string): unknown;
    addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void;
    setScopedStore(scopedStore: ScopedStore): void;
    getEncryptedShare(): ShareStore;
    addShareDescription(shareIndex: string, description: string): void;
    clone(): Metadata;
}
export default Metadata;
