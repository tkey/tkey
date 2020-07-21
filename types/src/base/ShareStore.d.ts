import { PolynomialID } from "./commonTypes";
import Share from "./Share";
declare class ShareStore {
    share: Share;
    polynomialID: PolynomialID;
    constructor({ share, polynomialID }: ShareStore);
}
export declare type ScopedStore = {
    encryptedShare: ShareStore;
};
export declare type ShareStorePolyIDShareIndexMap = {
    [polynomialID: string]: ShareStoreMap;
};
export declare type ShareStoreMap = {
    [shareIndex: string]: ShareStore;
};
export default ShareStore;
