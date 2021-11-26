import { throws } from "assert";

import CoreError from "../src/errors";

describe("Errors", function () {
  it("#serialize", function () {
    throws(
      () => {
        throw CoreError.metadataUndefined().toJSON();
      },
      {
        code: 1101,
        message: "metadata not found, SDK likely not intialized ",
      },
      "metadata error thrown"
    );
  });
  it("#fromCode", function () {
    throws(
      () => {
        throw CoreError.fromCode(1101).toJSON();
      },
      {
        code: 1101,
        message: "metadata not found, SDK likely not intialized ",
      },
      "metadata error thrown"
    );
  });
});
