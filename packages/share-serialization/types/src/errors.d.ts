import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
declare class ShareSerializationError extends TkeyError {
    code: number;
    message: string;
    protected static messages: ErrorCodes;
    constructor(code: number, message?: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static default(extraMessage?: string): ITkeyError;
    static typeNotSupported(extraMessage?: string): ITkeyError;
    static invalidEntropy(extraMessage?: string): ITkeyError;
    static invalidChecksum(extraMessage?: string): ITkeyError;
    static invalidMnemonic(extraMessage?: string): ITkeyError;
}
export default ShareSerializationError;
