/* eslint-disable no-console */
import { decrypt, encrypt, generatePrivate, getPublic } from "@toruslabs/eccrypto";
import assert from "assert";
import stringify from "json-stable-stringify";
import { compressToUTF16, decompressFromUTF16 } from "lz-string";

import { a } from "./temp";

describe("compression test", function () {
  it("should compress and decompress", async function () {
    const data = stringify(a);
    const privKey = generatePrivate();
    const publicKey = getPublic(privKey);
    const compressed = compressToUTF16(data);
    const cEncrypted = await encrypt(publicKey, Buffer.from(compressed, "utf16le"));
    // console.log(stringify(cEncrypted).length);
    const nEncrypted = await encrypt(publicKey, Buffer.from(data));
    // console.log(stringify(nEncrypted).length);
    // console.log(cEncrypted, nEncrypted);
    const cDecrypted = await decrypt(privKey, cEncrypted);
    const nDecrypted = await decrypt(privKey, nEncrypted);
    const decompressed = decompressFromUTF16(cDecrypted.toString("utf16le"));
    const decompressed2 = nDecrypted.toString();
    assert.strictEqual(decompressed, data);
    assert.strictEqual(decompressed2, data);
    console.log("compression %", ((stringify(nEncrypted).length - stringify(cEncrypted).length) / stringify(nEncrypted).length) * 100);
  });
});
