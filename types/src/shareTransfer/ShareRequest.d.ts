/// <reference types="node" />
import { ShareRequestArgs } from "../baseTypes/aggregateTypes";
import { EncryptedMessage } from "../baseTypes/commonTypes";
declare class ShareRequest {
    encPubKey: Buffer;
    encShareInTransit: EncryptedMessage;
    constructor({ encPubKey, encShareInTransit }: ShareRequestArgs);
}
export default ShareRequest;
