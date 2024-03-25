import { describe, it } from "node:test";

import { generatePrivate, KeyType } from "@tkey/common-types";
import assert from "assert";
import { BN } from "bn.js";

import TorusStorageLayer from "../src/TorusStorageLayer";

const metadataURL = process.env.METADATA || "https://node-1.dev-node.web3auth.io/metadata";

const keyTypes = [KeyType.ed25519, KeyType.secp256k1];
keyTypes.forEach((keyType) => {
  describe(`TorusStorageLayer test, keyType ${keyType}`, function () {
    it.only("#should encrypt and decrypt correctly", async function () {
      const privKey = generatePrivate(keyType);
      const tmp = new BN(123);
      const message = tmp.toBuffer();
      const storageLayer = new TorusStorageLayer({ hostUrl: metadataURL });
      await storageLayer.setMetadata({ input: message, privKey, keyType });

      const readResult = (await storageLayer.getMetadata({ privKey, keyType })) as { data: string };
      assert(Buffer.from(readResult.data).equals(Buffer.from(message)));
    });
  });
});
