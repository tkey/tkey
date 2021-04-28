/// <reference types="node" />
import { EncryptedMessage, ShareRequestArgs } from "@tkey/common-types";
declare class ShareRequest {
    encPubKey: Buffer;
    encShareInTransit: EncryptedMessage;
    availableShareIndexes: Array<string>;
    userAgent: string;
    userIp: string;
    timestamp: number;
    constructor({ encPubKey, encShareInTransit, availableShareIndexes, userAgent, userIp, timestamp }: ShareRequestArgs);
}
export default ShareRequest;
