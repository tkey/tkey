import { throws } from "assert";

import CoreError from "../src/errors";

describe("Errors", function () {
  it("#serialize", function () {
    throws(
      () => {
        throw CoreError.metadataUndefined();
      },
      function (err) {
        if (err instanceof CoreError && err.code === 1101 && err.message === "metadata not found, SDK likely not initialized ") return true;
      },
      "metadata error thrown"
    );
  });
  it("#fromCode", function () {
    throws(
      () => {
        throw CoreError.fromCode(1101);
      },
      function (err) {
        if (err instanceof CoreError && err.code === 1101 && err.message === "metadata not found, SDK likely not initialized ") return true;
      },
      "metadata error thrown"
    );
  });
});
