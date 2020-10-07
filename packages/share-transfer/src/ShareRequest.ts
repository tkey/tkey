import { BufferObj, EncryptedMessage, ShareRequestArgs } from "@tkey/common-types";

class ShareRequest {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;

  availableShareIndexes: Array<string>;

  userAgent: string;

  constructor({ encPubKey, encShareInTransit, availableShareIndexes, userAgent }: ShareRequestArgs) {
    const testEncPubKey = encPubKey as BufferObj;
    if (testEncPubKey.type === "Buffer") {
      this.encPubKey = Buffer.from(testEncPubKey.data);
    } else {
      this.encPubKey = (encPubKey as unknown) as Buffer;
    }
    this.availableShareIndexes = availableShareIndexes;
    this.encShareInTransit = encShareInTransit;
    this.userAgent = userAgent;
  }
}

export default ShareRequest;
