import BN from "bn.js";

import { ShareTransferStorePointerArgs } from "../baseTypes/aggregateTypes";

class ShareTransferStorePointer {
  pointer: BN;

  constructor({ pointer }: ShareTransferStorePointerArgs) {
    this.pointer = new BN(pointer, "hex");
  }
}
export default ShareTransferStorePointer;
