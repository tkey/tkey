/// <reference types="node" />
import { ShareRequestArgs } from "../baseTypes/aggregateTypes";
import { EncryptedMessage } from "../baseTypes/commonTypes";
declare class ShareRequest {
    encPubKey: Buffer;
    encShareInTransit: EncryptedMessage;
    availableShareIndexes: Array<string>;
    userAgent: string;
    constructor({ encPubKey, encShareInTransit, availableShareIndexes, userAgent }: ShareRequestArgs);
}
export default ShareRequest;
