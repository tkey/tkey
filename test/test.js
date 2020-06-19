import { deepStrictEqual } from "assert";

import ThresholdBak from "../src/index";

global.fetch = require("node-fetch");

describe("threshold bak", function () {
  it("#should return correct values when not skipping - mainnet", async function () {
    const tb = new ThresholdBak();
    const resp = await tb.initializeNewKey();
    console.log("new key resp", resp);
    const resp2 = await tb.initializeLogin();
  });
});
