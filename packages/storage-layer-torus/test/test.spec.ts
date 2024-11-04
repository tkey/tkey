import { describe, it } from "node:test";

import { KeyType } from "@tkey/common-types";
import assert from "assert";
import { BN } from "bn.js";

import TorusStorageLayer from "../src/TorusStorageLayer";

const metadataURL = process.env.METADATA || "https://node-1.dev-node.web3auth.io/metadata";

const keyTypes = [KeyType.ed25519, KeyType.secp256k1];
keyTypes.forEach((keyType) => {
  describe(`TorusStorageLayer test, keyType ${keyType}`, function () {
    it("#should encrypt and decrypt correctly", async function () {
      let rand = new Uint8Array(32);
      rand = crypto.getRandomValues(rand);

      const privKey = new BN(rand);
      const tmp = new BN(123);
      const message = tmp.toBuffer();
      const storageLayer = new TorusStorageLayer({ hostUrl: metadataURL });
      await storageLayer.setMetadata({ input: message, privKey });

      const readResult = (await storageLayer.getMetadata({ privKey })) as { data: string };
      assert(Buffer.from(readResult.data).equals(Buffer.from(message)));
    });

    it("#should set bulk stream ", async function () {
      let rand = new Uint8Array(32);
      rand = crypto.getRandomValues(rand);

      const privKey = new BN(rand);
      const tmp = new BN(123);
      const message = tmp.toBuffer();
      const storageLayer = new TorusStorageLayer({ hostUrl: metadataURL });
      await storageLayer.setMetadataStream({ input: [message, message.subarray(3)], privKey: [privKey, privKey] });

      const readResult = (await storageLayer.getMetadata({ privKey })) as { data: string };
      assert(Buffer.from(readResult.data).equals(Buffer.from(message.subarray(3))));
    });
  });
});
