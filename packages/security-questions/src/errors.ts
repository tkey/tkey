import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedSQError = {
  code: number;
  message: string;
};

class SQError extends CustomError {
  code: number;

  message: string;

  protected static messages = {
    2101: "security questions might not exist/be setup",
    2102: "security questions exists, cant replace, maybe change?",
    2103: "Incorrect answer",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message;

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "SQError" });
  }

  toJSON(): SerializedSQError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): SQError {
    return new SQError(code, `${SQError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  // Metadata
  public static unavailable(extraMessage = ""): SQError {
    return SQError.fromCode(2101, extraMessage);
  }

  public static unableToReplace(extraMessage = ""): SQError {
    return SQError.fromCode(2101, extraMessage);
  }

  public static incorrectAnswer(extraMessage = ""): SQError {
    return SQError.fromCode(2102, extraMessage);
  }
}
export default SQError;
