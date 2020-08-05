import BN from "bn.js";
import { ShareTransferStorePointerArgs } from "../base/aggregateTypes";
declare class ShareTransferStorePointer {
    pointer: BN;
    constructor({ pointer }: ShareTransferStorePointerArgs);
}
export default ShareTransferStorePointer;
