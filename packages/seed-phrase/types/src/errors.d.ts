import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
declare class SeedPhraseError extends TkeyError {
    code: number;
    message: string;
    protected static messages: ErrorCodes;
    constructor(code: number, message?: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static notSupported(extraMessage?: string): ITkeyError;
    static validationFailed(extraMessage?: string): ITkeyError;
    static invalid(extraMessage?: string): ITkeyError;
}
export default SeedPhraseError;
