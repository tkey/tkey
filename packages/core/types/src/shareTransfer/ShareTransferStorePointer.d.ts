import { ShareTransferStorePointerArgs } from "@tkey/types";
import BN from "bn.js";
declare class ShareTransferStorePointer {
    pointer: BN;
    constructor({ pointer }: ShareTransferStorePointerArgs);
}
export default ShareTransferStorePointer;
