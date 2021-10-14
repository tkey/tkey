import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";
/**
 * CoreError, extension for Error using CustomError
 * details: github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
 *
 * Usage:
 * 1. throw CoreError.metadataUndefined() // regularly used errors
 * 2. throw CoreError.fromCode(1304); // throw via code
 * 3. throw new CoreError(1000, "share indexes should be unique"); // for scarce errors
 *
 * Guide:
 * 1000 - core
 * 2000 - security questions
 * 3000 - webstorage
 * 4000 - common types (code reserved for future implementation)
 * 5000 - private key
 * 6000 - seed phrase
 * 7000 - share serialization
 * 8000 - share transfer
 */
declare class CoreError extends TkeyError {
    protected static messages: ErrorCodes;
    constructor(code: number, message: string);
    static fromCode(code: number, extraMessage?: string): ITkeyError;
    static default(extraMessage?: string): ITkeyError;
    static metadataUndefined(extraMessage?: string): ITkeyError;
    static delete1OutOf1OnlyManualSync(extraMessage?: string): ITkeyError;
    static metadataGetFailed(extraMessage?: string): ITkeyError;
    static metadataPostFailed(extraMessage?: string): ITkeyError;
    static tkeyStoreInvalid(extraMessage?: string): ITkeyError;
    static tkeyEncryptionFailed(extraMessage?: string): ITkeyError;
    static tkeyDecryptionFailed(extraMessage?: string): ITkeyError;
    static privateKeyUnavailable(extraMessage?: string): ITkeyError;
    static unableToReconstruct(extraMessage?: string): ITkeyError;
    static incorrectReconstruction(extraMessage?: string): ITkeyError;
    static encryptedShareStoreUnavailable(extraMessage?: string): ITkeyError;
    static acquireLockFailed(extraMessage?: string): ITkeyError;
    static releaseLockFailed(extraMessage?: string): ITkeyError;
    static privKeyUnavailable(extraMessage?: string): ITkeyError;
    static metadataPubKeyUnavailable(extraMessage?: string): ITkeyError;
    static authMetadataGetUnavailable(extraMessage?: string): ITkeyError;
    static authMetadataSetUnavailable(extraMessage?: string): ITkeyError;
}
export default CoreError;
