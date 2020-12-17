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
    // metadata
    1001: "metadata not found, SDK likely not intialized",
    1002: "getMetadata errored",
    1003: "setMetadata errored",
    // tkeystore
    1101: "Invalid tkeyStore",
    1102: "Encryption failed",
    1103: "Decryption failed",
    // shares
    1201: "Private key not available. please reconstruct key first",
    1202: "not enough shares for reconstruction",
    1203: "reconstructed key is not pub key",
    1204: "Share found in unexpected polynomial",
    // lock
    1301: "Unable to acquire lock",
    1302: "Unable to release lock",
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

  public static fromCode(code: number): CoreError {
    return new CoreError(code, CoreError.messages[code]);
  }

  // Custom methods
  public static metadataUndefined(): CoreError {
    return CoreError.fromCode(4001);
  }
}
export default CoreError;
