import BN from "bn.js";
import { ShareTransferStorePointerArgs } from "../baseTypes/aggregateTypes";
declare class ShareTransferStorePointer {
    pointer: BN;
    constructor({ pointer }: ShareTransferStorePointerArgs);
}
export default ShareTransferStorePointer;
