import { BufferObj, ShareRequestArgs } from "../baseTypes/aggregateTypes";
import { EncryptedMessage } from "../baseTypes/commonTypes";

class ShareRequest {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;

  constructor({ encPubKey, encShareInTransit }: ShareRequestArgs) {
    const testEncPubKey = encPubKey as BufferObj;
    if (testEncPubKey.type === "Buffer") {
      this.encPubKey = Buffer.from(testEncPubKey.data);
    } else {
      this.encPubKey = (encPubKey as unknown) as Buffer;
    }
    this.encShareInTransit = encShareInTransit;
  }
}

export default ShareRequest;
