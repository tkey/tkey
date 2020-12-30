import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedShareTransferError = {
  code: number;
  message: string;
};

class ShareTransferError extends CustomError {
  code: number;

  message: string;

  protected static messages = {
    7000: "Custom",
    // Misc
    7010: "Type is not supported",
    7011: "Invalid Entropy",
    7012: "Invalid Checksum",
    7013: "Invalid mnemonic",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message;

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "ShareTransferError" });
  }

  toJSON(): SerializedShareTransferError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): ShareTransferError {
    return new ShareTransferError(code, `${ShareTransferError.messages[code]}${extraMessage}`);
  }

  public static default(extraMessage = ""): ShareTransferError {
    return new ShareTransferError(7000, `${ShareTransferError.messages[7000]}${extraMessage}`);
  }

  // Custom methods
  public static typeNotSupported(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(7010, extraMessage);
  }

  public static invalidEntropy(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(7011, extraMessage);
  }

  public static invalidChecksum(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(7012, extraMessage);
  }

  public static invalidMnemonic(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(7013, extraMessage);
  }
}
export default ShareTransferError;
