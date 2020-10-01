import BN from "bn.js";
import { BNString, ISerializable, StringifiedType } from "../baseTypes/commonTypes";
import PublicShare from "./PublicShare";
declare class Share implements ISerializable {
    share: BN;
    shareIndex: BN;
    constructor(shareIndex: BNString, share: BNString);
    getPublicShare(): PublicShare;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): Share;
}
export default Share;
