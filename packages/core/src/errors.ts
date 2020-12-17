import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

export type SerializedCoreError = {
  code: number;
  message: string;
};

export interface CoreCodes {
  readonly custom: 4000;
  readonly invalidMetadata: 4001;
  readonly invalidGetMetadata: 4002;
  readonly invalidSetMetadata: 4003;
  readonly unableToAcquireLock: 4010;
  readonly unableToReleaseLock: 4011;
  readonly invalidTkeyStore: 4020;
  readonly encryptFailed: 4030;
  readonly decryptFailed: 4031;
}

class CoreError extends CustomError {
  code: number;

  message: string;

  protected static messages = {
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
    // lock
    1401: "Unable to acquire lock",
    1402: "Unable to release lock",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message;

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "CoreError" });
  }

  toJSON(): SerializedCoreError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): CoreError {
    return new CoreError(code, `${CoreError.messages[code]} ${extraMessage}`);
  }

  // Custom methods
  // Metadata
  public static metadataUndefined(extraMessage = ""): CoreError {
    return CoreError.fromCode(1101, extraMessage);
  }

  public static metadataGetFailed(extraMessage = ""): CoreError {
    return CoreError.fromCode(1102, extraMessage);
  }

  public static metadataPostFailed(extraMessage = ""): CoreError {
    return CoreError.fromCode(1103, extraMessage);
  }

  // TkeyData
  public static tkeyStoreInvalid(extraMessage = ""): CoreError {
    return CoreError.fromCode(1201, extraMessage);
  }

  public static tkeyEncryptionFailed(extraMessage = ""): CoreError {
    return CoreError.fromCode(1202, extraMessage);
  }

  public static tkeyDecryptionFailed(extraMessage = ""): CoreError {
    return CoreError.fromCode(1203, extraMessage);
  }

  // Shares
  public static privateKeyUnAvailable(extraMessage = ""): CoreError {
    return CoreError.fromCode(1301, extraMessage);
  }

  public static unableToReconstruct(extraMessage = ""): CoreError {
    return CoreError.fromCode(1302, extraMessage);
  }

  public static incorrectReconstruction(extraMessage = ""): CoreError {
    return CoreError.fromCode(1303, extraMessage);
  }

  // Metadata locks
  public static acquireLockFailed(extraMessage = ""): CoreError {
    return CoreError.fromCode(1401, extraMessage);
  }

  public static releaseLockFailed(extraMessage = ""): CoreError {
    return CoreError.fromCode(1402, extraMessage);
  }
}
export default CoreError;
