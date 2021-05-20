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
class CoreError extends TkeyError {
  protected static messages: ErrorCodes = {
    1000: "Custom",
    // Misc
    1001: "Unable to delete service provider share",
    1002: "Wrong share index",
    // metadata
    1101: "metadata not found, SDK likely not intialized",
    1102: "getMetadata errored",
    1103: "setMetadata errored",
    // tkeystore
    1201: "Invalid tkeyStore",
    1202: "Encryption failed",
    1203: "Decryption failed",
    // shares
    1301: "Private key not available. Please reconstruct key first",
    1302: "Unable to reconstruct",
    1303: "reconstructed key is not pub key",
    1304: "Share found in unexpected polynomial",
    1305: "Input is not supported",
    1306: "no encrypted share store for share exists",
    1307: "Share doesn't exist",
    // lock
    1401: "Unable to acquire lock",
    1402: "Unable to release lock",
    // auth metadata
    1501: "privkey unavailable",
    1502: "metadata pubkey unavailable",
  };

  public constructor(code: number, message: string) {
    // takes care of stack and proto
    super(code, message);

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "CoreError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new CoreError(code, `${CoreError.messages[code]} ${extraMessage}`);
  }

  public static default(extraMessage = ""): ITkeyError {
    return new CoreError(1000, `${CoreError.messages[1000]} ${extraMessage}`);
  }

  // Custom methods
  // Metadata
  public static metadataUndefined(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1101, extraMessage);
  }

  public static metadataGetFailed(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1102, extraMessage);
  }

  public static metadataPostFailed(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1103, extraMessage);
  }

  // TkeyData
  public static tkeyStoreInvalid(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1201, extraMessage);
  }

  public static tkeyEncryptionFailed(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1202, extraMessage);
  }

  public static tkeyDecryptionFailed(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1203, extraMessage);
  }

  // Shares
  public static privateKeyUnavailable(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1301, extraMessage);
  }

  public static unableToReconstruct(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1302, extraMessage);
  }

  public static incorrectReconstruction(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1303, extraMessage);
  }

  public static encryptedShareStoreUnavailable(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1306, extraMessage);
  }

  // Metadata locks
  public static acquireLockFailed(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1401, extraMessage);
  }

  public static releaseLockFailed(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1402, extraMessage);
  }

  // Authmetadata
  public static privKeyUnavailable(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1501, extraMessage);
  }

  public static metadataPubKeyUnavailable(extraMessage = ""): ITkeyError {
    return CoreError.fromCode(1502, extraMessage);
  }
}
export default CoreError;
