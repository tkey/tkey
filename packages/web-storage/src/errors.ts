import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";

class WebStorageError extends TkeyError {
  protected static messages: ErrorCodes = {
    3000: "default",
    // module
    3101: "unableToReadFromStorage",
    // fileStorage
    3201: "No Share exists in file system",
    3202: "No requestFileSystem",
    // localstorage
    3301: "Local storage is not enabled",
    3302: "No share exists in localstorage",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "WebStorageError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new WebStorageError(code, `${WebStorageError.messages[code]}${extraMessage}`);
  }

  public static default(extraMessage = ""): ITkeyError {
    return new WebStorageError(3000, `${WebStorageError.messages[3000]}${extraMessage}`);
  }

  // Custom methods
  public static unableToReadFromStorage(extraMessage = ""): ITkeyError {
    return WebStorageError.fromCode(3101, extraMessage);
  }

  public static shareUnavailableInFileStorage(extraMessage = ""): ITkeyError {
    return WebStorageError.fromCode(3201, extraMessage);
  }

  public static fileStorageUnavailable(extraMessage = ""): ITkeyError {
    return WebStorageError.fromCode(3202, extraMessage);
  }

  public static localStorageUnavailable(extraMessage = ""): ITkeyError {
    return WebStorageError.fromCode(3301, extraMessage);
  }

  public static shareUnavailableInLocalStorage(extraMessage = ""): ITkeyError {
    return WebStorageError.fromCode(3302, extraMessage);
  }
}
export default WebStorageError;
