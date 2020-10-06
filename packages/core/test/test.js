import BN from "bn.js";

import { Metadata } from "..";

const PRIVATE_KEY = "e70fb5f5970b363879bc36f54d4fc0ad77863bfd059881159251f50f48863acf";

describe("Metadata", function () {
  it("#should serialize and deserialize into JSON seamlessly", async function () {
    const privKey = PRIVATE_KEY;
    const privKeyBN = new BN(privKey, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    for (let i = 1; i <= 2; i += 1) {
      let ran = generatePrivate();
      while (ran < 2) {
        ran = generatePrivate();
      }
      shareIndexes.push(new BN(ran));
    }
    const poly = generateRandomPolynomial(1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(getPubKeyPoint(privKeyBN));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });
    const serializedMetadata = stringify(metadata);
    const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
    const secondSerialization = stringify(deserializedMetadata);
    deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
  it("#should serialize and deserialize into JSON with tkey store seamlessly", async function () {
    const privKey = PRIVATE_KEY;
    const privKeyBN = new BN(privKey, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    for (let i = 1; i <= 2; i += 1) {
      let ran = generatePrivate();
      while (ran < 2) {
        ran = generatePrivate();
      }
      shareIndexes.push(new BN(ran));
    }
    const poly = generateRandomPolynomial(1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(getPubKeyPoint(privKeyBN));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setTkeyStoreDomain("something", { test: "oh this is an object" });
    const serializedMetadata = stringify(metadata);
    const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
    const secondSerialization = stringify(deserializedMetadata);
    deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
  it("#should serialize and deserialize into JSON with tkey store seamlessly", async function () {
    const privKey = PRIVATE_KEY;
    const privKeyBN = new BN(privKey, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    for (let i = 1; i <= 2; i += 1) {
      let ran = generatePrivate();
      while (ran < 2) {
        ran = generatePrivate();
      }
      shareIndexes.push(new BN(ran));
    }
    const poly = generateRandomPolynomial(1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(getPubKeyPoint(privKeyBN));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setScopedStore("something", { test: "oh this is an object" });
    const serializedMetadata = stringify(metadata);
    const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
    const secondSerialization = stringify(deserializedMetadata);
    deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
    const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
    deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
  });
});
