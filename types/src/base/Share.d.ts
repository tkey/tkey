import BN from "bn.js";
import { BNString } from "./commonTypes";
import PublicShare from "./PublicShare";
declare class Share {
    share: BN;
    shareIndex: BN;
    constructor(shareIndex: BNString, share: BNString);
    getPublicShare(): PublicShare;
}
export default Share;
