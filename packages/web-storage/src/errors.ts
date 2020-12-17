import stringify from "json-stable-stringify";
import { CustomError } from "ts-custom-error";

// @flow

type SerializedWebStorageError = {
  code: number;
  message: string;
};

class WebStorageError extends CustomError {
  code: number;

  message: string;

  protected static messages = {
    // module
    3101: "unableToReadFromStorage",
    // fileStorage
    3201: "No Share exists in file system",
    3202: "No requestFileSystem",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message;

    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "WebStorageError" });
  }

  toJSON(): SerializedWebStorageError {
    return {
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return stringify(this.toJSON());
  }

  public static fromCode(code: number, extraMessage = ""): WebStorageError {
    return new WebStorageError(code, `${WebStorageError.messages[code]}${extraMessage}`);
  }

  // Custom methods
  public static unableToReadFromStorage(extraMessage = ""): WebStorageError {
    return WebStorageError.fromCode(3101, extraMessage);
  }

  public static noShareInFileStorage(extraMessage = ""): WebStorageError {
    return WebStorageError.fromCode(3102, extraMessage);
  }

  public static noFileStorage(extraMessage = ""): WebStorageError {
    return WebStorageError.fromCode(3101, extraMessage);
  }
}
export default WebStorageError;
