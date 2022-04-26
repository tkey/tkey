import { ErrorCodes, ITkeyError, TkeyError } from "@tkey/common-types";

class ShareTransferError extends TkeyError {
  protected static messages: ErrorCodes = {
    8000: "Custom",
    // Misc
    8010: "Missing current enc key",
    8011: "Current request already exists",
    8012: "User cancelled request",
  };

  public constructor(code: number, message?: string) {
    // takes care of stack and proto
    super(code, message);
    // Set name explicitly as minification can mangle class names
    Object.defineProperty(this, "name", { value: "ShareTransferError" });
  }

  public static fromCode(code: number, extraMessage = ""): ITkeyError {
    return new ShareTransferError(code, `${ShareTransferError.messages[code]}${extraMessage}`);
  }

  public static default(extraMessage = ""): ITkeyError {
    return new ShareTransferError(8000, `${ShareTransferError.messages[8000]}${extraMessage}`);
  }

  // Custom methods
  public static missingEncryptionKey(extraMessage = ""): ITkeyError {
    return ShareTransferError.fromCode(8010, extraMessage);
  }

  public static requestExists(extraMessage = ""): ITkeyError {
    return ShareTransferError.fromCode(8011, extraMessage);
  }

  public static userCancelledRequest(extraMessage = ""): ITkeyError {
    return ShareTransferError.fromCode(8012, extraMessage);
  }
}
export default ShareTransferError;
