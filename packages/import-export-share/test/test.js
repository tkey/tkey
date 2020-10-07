import { deepStrictEqual } from "assert";
import BN from "bn.js";

import { ImportExportModule } from "../index";

describe("Import export shares", function () {
  it("#should export share", async function () {
    const instance = new ImportExportModule();
    const key = new BN("6bd39a72bc7aa54f9a19e1cc9873de54a7903cc1a3e9fc792d463f06ca2806b9", "hex");
    const seed = instance.exportShare(key);
    const share = instance.importShare(seed);
    deepStrictEqual(key, share);
  });
});
