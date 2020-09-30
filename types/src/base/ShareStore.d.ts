import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import Share from "./Share";
declare class ShareStore implements ISerializable {
    share: Share;
    polynomialID: PolynomialID;
    constructor(share: Share, polynomialID: PolynomialID);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): ShareStore;
}
export declare type EncryptedShareStore = {
    [shareCommitment: string]: ShareStore;
};
export declare type ShareStoreMap = {
    [shareIndex: string]: ShareStore;
};
export declare type ShareStorePolyIDShareIndexMap = {
    [polynomialID: string]: ShareStoreMap;
};
export default ShareStore;
