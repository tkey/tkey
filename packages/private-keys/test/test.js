import { deepStrictEqual, fail } from "assert";
import { BN } from "bn.js";

import { ED25519Format } from "../src/ED25519Format";

describe("ed25519", function () {
  it("#should create ed25519 private key if not supplied", async function () {
    const keyFormat = new ED25519Format();
    const privateKeyStore = keyFormat.createPrivateKeyStore();
    if (!privateKeyStore) {
      fail("unable to create ed25519 key");
    }
  });
  it("#should use the same ed25519 private key if supplied", async function () {
    const keyFormat = new ED25519Format();
    const privateKeyStore = keyFormat.createPrivateKeyStore(new BN("c2e198c3e6fb83d36d162f5a000aef0708ada6c5b201dc5d5303cb11dc03eb95", "hex"));
    if (!privateKeyStore) {
      fail("unable to create ed25519 key");
    }
    deepStrictEqual(privateKeyStore.privateKey.toString("hex"), "c2e198c3e6fb83d36d162f5a000aef0708ada6c5b201dc5d5303cb11dc03eb95");
  });
  it("#should not be able to validate an invalid ed25519 private key", async function () {
    // invalid private key
    const key = new BN("00000000000000000000000a000aef0708ada6c5b211dc5d5303cb11dc03eb95", "hex");
    const keyFormat = new ED25519Format();
    if (keyFormat.validatePrivateKey(key)) {
      fail("validated an invalid ed25519 key");
    }
  });
  it("#should be able to validate a valid ed25519 private key", async function () {
    const keyFormat = new ED25519Format();
    if (!keyFormat.validatePrivateKey(new BN("c2e198c3e6fb83d36d162f5a000aef0708ada6c5b201dc5d5303cb11dc03eb95", "hex"))) {
      fail("not able to validate ed25519 key");
    }
  });
});
