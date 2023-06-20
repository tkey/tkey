import { deepStrictEqual } from "assert";
import BN from "bn.js";

import { ShareSerializationModule } from "../src/index";

describe("Share serialization", function () {
  it("#should export share", async function () {
    const instance = new ShareSerializationModule();
    const key = new BN("6bd39a72bc7aa54f9a19e1cc9873de54a7903cc1a3e9fc792d463f06ca2806b9", "hex");
    const seed = await instance.serialize(key, "mnemonic");
    const share = await instance.deserialize(seed, "mnemonic");
    deepStrictEqual(key, share);
  });
});
