import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
declare class WebStorageError extends TkeyError {
    code: number;
    message: string;
    protected static messages: ErrorCodes;
    constructor(code: number, message?: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static unableToReadFromStorage(extraMessage?: string): ITkeyError;
    static shareUnavailableInFileStorage(extraMessage?: string): ITkeyError;
    static fileStorageUnavailable(extraMessage?: string): ITkeyError;
    static localStorageUnavailable(extraMessage?: string): ITkeyError;
    static shareUnavailableInLocalStorage(extraMessage?: string): ITkeyError;
}
export default WebStorageError;
