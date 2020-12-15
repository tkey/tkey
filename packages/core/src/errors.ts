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
    4000: "Custom",
    4001: "metadata not found, SDK likely not intialized",
    4002: "getMetadata errored",
    4003: "setMetadata errored",
    4004: "not enough shares for reconstruction",
    4005: "reconstructed key is not pub key",
    4006: "Private key not available. please reconstruct key first",
    4007: "Share found in unexpected polynomial",
    4010: "Unable to acquire lock",
    4011: "Unable to release lock",
    4020: "Invalid tkeyStore",
  };

  public constructor(code: number, message?: string) {
    super(message);
    this.code = code;
    this.message = message;
    Object.defineProperty(this, "name", { value: "CoreError" });
  }

  serialize(): SerializedCoreError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.serialize());
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
