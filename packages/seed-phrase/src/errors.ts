import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedSeedPhraseError = {
  code: number;
  message: string;
};

class SeedPhraseError extends CustomError {
  code: number;

  message: string;

  protected static messages = {
    6000: "Custom",
    // Misc
    6010: "Private key type is not supported",
    6011: "validation failed",
    6012: "Seed phrase is invalid for ",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message;

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "SeedPhraseError" });
  }

  toJSON(): SerializedSeedPhraseError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): SeedPhraseError {
    return new SeedPhraseError(code, `${SeedPhraseError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static notSupported(extraMessage = ""): SeedPhraseError {
    return SeedPhraseError.fromCode(6010, extraMessage);
  }

  public static validationFailed(extraMessage = ""): SeedPhraseError {
    return SeedPhraseError.fromCode(6011, extraMessage);
  }

  public static invalid(extraMessage = ""): SeedPhraseError {
    return SeedPhraseError.fromCode(6012, extraMessage);
  }
}
export default SeedPhraseError;
