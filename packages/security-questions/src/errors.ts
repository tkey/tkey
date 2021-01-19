import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";

class SecurityQuestionsError extends TkeyError {
  protected static messages: ErrorCodes = {
    2101: "security questions might not exist/be setup",
    2102: "security questions exists, cant replace, maybe change?",
    2103: "Incorrect answer",
    2104: "no password saved on tkeyStore",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "SecurityQuestionsError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new SecurityQuestionsError(code, `${SecurityQuestionsError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static unavailable(extraMessage = ""): ITkeyError {
    return SecurityQuestionsError.fromCode(2101, extraMessage);
  }

  public static unableToReplace(extraMessage = ""): ITkeyError {
    return SecurityQuestionsError.fromCode(2102, extraMessage);
  }

  public static incorrectAnswer(extraMessage = ""): ITkeyError {
    return SecurityQuestionsError.fromCode(2103, extraMessage);
  }

  public static noPasswordSaved(extraMessage = ""): ITkeyError {
    return SecurityQuestionsError.fromCode(2104, extraMessage);
  }
}
export default SecurityQuestionsError;
