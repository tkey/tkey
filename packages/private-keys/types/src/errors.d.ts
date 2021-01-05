import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
declare class PrivateKeysError extends TkeyError {
    protected static messages: ErrorCodes;
    constructor(code: number, message?: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static notSupported(extraMessage?: string): ITkeyError;
    static validationFailed(extraMessage?: string): ITkeyError;
    static invalidPrivateKey(extraMessage?: string): ITkeyError;
}
export default PrivateKeysError;
