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
    return SeedPhraseError.fromCode(5010, extraMessage);
  }

  public static validationFailed(extraMessage = ""): SeedPhraseError {
    return SeedPhraseError.fromCode(5011, extraMessage);
  }
}
export default SeedPhraseError;
