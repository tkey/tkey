/// <reference types="node" />
import { ShareRequestArgs } from "../base/aggregateTypes";
import { EncryptedMessage } from "../base/commonTypes";
declare class ShareRequest {
    encPubKey: Buffer;
    encShareInTransit: EncryptedMessage;
    constructor({ encPubKey, encShareInTransit }: ShareRequestArgs);
}
export default ShareRequest;
