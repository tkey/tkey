/// <reference types="node" />
import { EncryptedMessage, ShareRequestArgs } from "@tkey/types";
declare class ShareRequest {
    encPubKey: Buffer;
    encShareInTransit: EncryptedMessage;
    availableShareIndexes: Array<string>;
    userAgent: string;
    constructor({ encPubKey, encShareInTransit, availableShareIndexes, userAgent }: ShareRequestArgs);
}
export default ShareRequest;
