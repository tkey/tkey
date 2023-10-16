import { ErrorCodes, ITkeyError, TkeyError } from "@oraichain/common-types";

class PrivateKeysError extends TkeyError {
  protected static messages: ErrorCodes = {
    5000: "Custom",
    // Misc
    5010: "Private key type is not supported",
    5011: "validation failed",
    5012: "Invalid private key",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "PrivateKeysError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new PrivateKeysError(code, `${PrivateKeysError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static notSupported(extraMessage = ""): ITkeyError {
    return PrivateKeysError.fromCode(5010, extraMessage);
  }

  public static validationFailed(extraMessage = ""): ITkeyError {
    return PrivateKeysError.fromCode(5011, extraMessage);
  }

  public static invalidPrivateKey(extraMessage = ""): ITkeyError {
    return PrivateKeysError.fromCode(5012, extraMessage);
  }
}
export default PrivateKeysError;
