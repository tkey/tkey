import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";

class ShareSerializationError extends TkeyError {
  protected static messages: ErrorCodes = {
    7000: "Custom",
    // Misc
    7010: "Type is not supported",
    7011: "Invalid Entropy",
    7012: "Invalid Checksum",
    7013: "Invalid mnemonic",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "ShareSerializationError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new ShareSerializationError(code, `${ShareSerializationError.messages[code]}${extraMessage}`);
  }

  public static default(extraMessage = ""): ITkeyError {
    return new ShareSerializationError(7000, `${ShareSerializationError.messages[7000]}${extraMessage}`);
  }

  // Custom methods
  public static typeNotSupported(extraMessage = ""): ITkeyError {
    return ShareSerializationError.fromCode(7010, extraMessage);
  }

  public static invalidEntropy(extraMessage = ""): ITkeyError {
    return ShareSerializationError.fromCode(7011, extraMessage);
  }

  public static invalidChecksum(extraMessage = ""): ITkeyError {
    return ShareSerializationError.fromCode(7012, extraMessage);
  }

  public static invalidMnemonic(extraMessage = ""): ITkeyError {
    return ShareSerializationError.fromCode(7013, extraMessage);
  }
}
export default ShareSerializationError;
