import { generatePrivate, KeyType } from "@tkey/common-types";
import { deepStrictEqual } from "assert";
import BN from "bn.js";

import ServiceProviderBase from "../src/ServiceProviderBase";

const keyTypes = [KeyType.ed25519, KeyType.secp256k1];

describe("ServiceProvider", function () {
  it("#should encrypt and decrypt correctly", async function () {
    keyTypes.forEach(async (keyType) => {
      const privKey = generatePrivate(keyType);
      const tmp = new BN(123);
      const message = Buffer.from(tmp.toString("hex", 15));
      const tsp = new ServiceProviderBase({ postboxKey: privKey, keyType });
      const encDeets = await tsp.encrypt(message);
      const result = await tsp.decrypt(encDeets);
      deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
    });
  });

  it("#should encrypt and decrypt correctly messages > 15", async function () {
    keyTypes.forEach(async (keyType) => {
      const privKey = generatePrivate(keyType);
      const tmp = new BN(123);
      const message = Buffer.from(tmp.toString("hex", 16));
      const tsp = new ServiceProviderBase({ postboxKey: privKey, keyType });
      const encDeets = await tsp.encrypt(message);
      const result = await tsp.decrypt(encDeets);
      deepStrictEqual(result, message, "encrypted and decrypted message should be equal");
    });
  });
});
