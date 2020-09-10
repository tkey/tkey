import { BufferObj, ShareRequestArgs } from "../baseTypes/aggregateTypes";
import { EncryptedMessage } from "../baseTypes/commonTypes";

class ShareRequest {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;

  availableShareIndexes: Array<string>;

  constructor({ encPubKey, encShareInTransit, availableShareIndexes }: ShareRequestArgs) {
    const testEncPubKey = encPubKey as BufferObj;
    if (testEncPubKey.type === "Buffer") {
      this.encPubKey = Buffer.from(testEncPubKey.data);
    } else {
      this.encPubKey = (encPubKey as unknown) as Buffer;
    }
    this.availableShareIndexes = availableShareIndexes;
    this.encShareInTransit = encShareInTransit;
  }
}

export default ShareRequest;
