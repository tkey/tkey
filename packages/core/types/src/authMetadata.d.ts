import { IAuthMetadata, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";
import Metadata from "./metadata";
declare class AuthMetadata implements IAuthMetadata {
    metadata: Metadata;
    privKey: BN;
    constructor(metadata: Metadata, privKey?: BN);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): AuthMetadata;
}
export default AuthMetadata;
