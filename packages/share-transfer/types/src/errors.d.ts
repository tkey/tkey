import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
declare class ShareTransferError extends TkeyError {
    code: number;
    message: string;
    protected static messages: ErrorCodes;
    constructor(code: number, message?: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static default(extraMessage?: string): ITkeyError;
    static missingEncryptionKey(extraMessage?: string): ITkeyError;
    static requestExists(extraMessage?: string): ITkeyError;
    static userCancelledRequest(extraMessage?: string): ITkeyError;
}
export default ShareTransferError;
