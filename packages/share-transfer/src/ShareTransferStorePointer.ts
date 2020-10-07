import { ShareTransferStorePointerArgs } from "@tkey/common-types";
import BN from "bn.js";

class ShareTransferStorePointer {
  pointer: BN;

  constructor({ pointer }: ShareTransferStorePointerArgs) {
    this.pointer = new BN(pointer, "hex");
  }
}
export default ShareTransferStorePointer;
