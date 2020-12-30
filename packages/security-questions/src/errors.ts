import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedSecurityQuestionsError = {
  code: number;
  message: string;
};

class SecurityQuestionsError extends CustomError {
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
    Object.defineProperty(this, "name", { value: "SecurityQuestionsError" });
  }

  toJSON(): SerializedSecurityQuestionsError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): SecurityQuestionsError {
    return new SecurityQuestionsError(code, `${SecurityQuestionsError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static unavailable(extraMessage = ""): SecurityQuestionsError {
    return SecurityQuestionsError.fromCode(2101, extraMessage);
  }

  public static unableToReplace(extraMessage = ""): SecurityQuestionsError {
    return SecurityQuestionsError.fromCode(2101, extraMessage);
  }

  public static incorrectAnswer(extraMessage = ""): SecurityQuestionsError {
    return SecurityQuestionsError.fromCode(2102, extraMessage);
  }
}
export default SecurityQuestionsError;
