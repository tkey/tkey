import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
declare class SecurityQuestionsError extends TkeyError {
    protected static messages: ErrorCodes;
    constructor(code: number, message?: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static unavailable(extraMessage?: string): ITkeyError;
    static unableToReplace(extraMessage?: string): ITkeyError;
    static incorrectAnswer(extraMessage?: string): ITkeyError;
    static noPasswordSaved(extraMessage?: string): ITkeyError;
}
export default SecurityQuestionsError;
