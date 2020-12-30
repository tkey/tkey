import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedPrivateKeysError = {
  code: number;
  message: string;
};

class PrivateKeysError extends CustomError {
  code: number;

  message: string;

  protected static messages = {
    5000: "Custom",
    // Misc
    5010: "Private key type is not supported",
    5011: "validation failed",
    5012: "Invalid private key",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message;

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "PrivateKeysError" });
  }

  toJSON(): SerializedPrivateKeysError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): PrivateKeysError {
    return new PrivateKeysError(code, `${PrivateKeysError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static notSupported(extraMessage = ""): PrivateKeysError {
    return PrivateKeysError.fromCode(5010, extraMessage);
  }

  public static validationFailed(extraMessage = ""): PrivateKeysError {
    return PrivateKeysError.fromCode(5011, extraMessage);
  }

  public static invalidPrivateKey(extraMessage = ""): PrivateKeysError {
    return PrivateKeysError.fromCode(5012, extraMessage);
  }
}
export default PrivateKeysError;
