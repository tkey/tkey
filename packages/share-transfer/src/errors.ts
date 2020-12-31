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
    8000: "Custom",
    // Misc
    8010: "Missing current enc key",
    8011: "Current request already exists",
    8012: "User cancelled request",
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
    return new ShareTransferError(8000, `${ShareTransferError.messages[8000]}${extraMessage}`);
  }

  // Custom methods
  public static missingEncryptionKey(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(8010, extraMessage);
  }

  public static requestExists(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(8011, extraMessage);
  }

  public static userCancelledRequest(extraMessage = ""): ShareTransferError {
    return ShareTransferError.fromCode(8012, extraMessage);
  }
}
export default ShareTransferError;
