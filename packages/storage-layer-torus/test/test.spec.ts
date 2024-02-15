import { describe, it } from "node:test";

import { generatePrivate, KeyType } from "@tkey/common-types";
import { BN } from "bn.js";

import TorusStorageLayer from "../src/TorusStorageLayer";

const metadataURL = "https://metadata.tor.us";
const keyTypes = [KeyType.secp256k1, KeyType.ed25519];
keyTypes.forEach((keyType) => {
  describe(`TorusStorageLayer test, keyType ${keyType}`, function () {
    it("#should encrypt and decrypt correctly", async function () {
      const privKey = generatePrivate(keyType);
      const tmp = new BN(123);
      const message = Buffer.from(tmp.toString("hex"));
      const storageLayer = new TorusStorageLayer({ hostUrl: metadataURL });
      const result = await storageLayer.setMetadata({ input: message, privKey, keyType });
      // eslint-disable-next-line no-console
      console.log(result);
    });
  });
});
