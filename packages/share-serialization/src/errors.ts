import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedShareSerializationError = {
  code: number;
  message: string;
};

class ShareSerializationError extends CustomError {
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
    Object.defineProperty(this, "name", { value: "ShareSerializationError" });
  }

  toJSON(): SerializedShareSerializationError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): ShareSerializationError {
    return new ShareSerializationError(code, `${ShareSerializationError.messages[code]}${extraMessage}`);
  }

  public static default(extraMessage = ""): ShareSerializationError {
    return new ShareSerializationError(7000, `${ShareSerializationError.messages[7000]}${extraMessage}`);
  }

  // Custom methods
  public static typeNotSupported(extraMessage = ""): ShareSerializationError {
    return ShareSerializationError.fromCode(7010, extraMessage);
  }

  public static invalidEntropy(extraMessage = ""): ShareSerializationError {
    return ShareSerializationError.fromCode(7011, extraMessage);
  }

  public static invalidChecksum(extraMessage = ""): ShareSerializationError {
    return ShareSerializationError.fromCode(7012, extraMessage);
  }

  public static invalidMnemonic(extraMessage = ""): ShareSerializationError {
    return ShareSerializationError.fromCode(7013, extraMessage);
  }
}
export default ShareSerializationError;
