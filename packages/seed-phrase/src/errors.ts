import { ErrorCodes, ITkeyError, TkeyError } from "@oraichain/common-types";

class SeedPhraseError extends TkeyError {
  protected static messages: ErrorCodes = {
    6000: "Custom",
    // Misc
    6010: "Private key type is not supported",
    6011: "validation failed",
    6012: "Seed phrase is invalid for ",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "SeedPhraseError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new SeedPhraseError(code, `${SeedPhraseError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static notSupported(extraMessage = ""): ITkeyError {
    return SeedPhraseError.fromCode(6010, extraMessage);
  }

  public static validationFailed(extraMessage = ""): ITkeyError {
    return SeedPhraseError.fromCode(6011, extraMessage);
  }

  public static invalid(extraMessage = ""): ITkeyError {
    return SeedPhraseError.fromCode(6012, extraMessage);
  }
}
export default SeedPhraseError;
