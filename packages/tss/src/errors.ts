export interface ITkeyError extends Error {
  name: string;
  code: number;
  message: string;
  toString(): string;
}

export type ErrorCodes = {
  [key: number]: string;
};

export abstract class TkeyError extends Error implements ITkeyError {
  code: number;

  message: string;

  public constructor(code?: number, message?: string) {
    // takes care of stack and proto
    super(message);

    this.code = code;
    this.message = message || "";
  }

  toJSON(): ITkeyError {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

export class TSSError extends TkeyError {
  protected static messages: ErrorCodes = {
    8000: "default",
    // module
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "TSSError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new TSSError(code, `${TSSError.messages[code]}${extraMessage}`);
  }

  public static default(extraMessage = ""): ITkeyError {
    return new TSSError(8000, `${TSSError.messages[8000]}${extraMessage}`);
  }
}
