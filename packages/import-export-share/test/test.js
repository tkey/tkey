import BN from "bn.js";

import ImportExportModule from "../index";

describe("Import export shares", function () {
  it("#should export share", async function () {
    const instance = ImportExportModule();
    const key = new BN("03e49c066d7849a92f048704ea775a698d164918851f6f0ab3622306454e9201d0");
    const seed = instance.exportShare(key);
    console.log(seed);
  });
});
