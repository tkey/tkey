import { BufferObj, ShareRequestArgs } from "../base/aggregateTypes";
import { EncryptedMessage } from "../base/commonTypes";

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
