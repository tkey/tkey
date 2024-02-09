import { generatePrivate, KeyType, Point } from "@tkey/common-types";
import { deepStrictEqual } from "assert";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import { generateRandomPolynomial, Metadata } from "../src/index";

const testVariables = [{ keyType: KeyType.secp256k1 }, { keyType: KeyType.ed25519 }];

testVariables.forEach((testVariable) => {
  const { keyType } = testVariable;
  const testKeyType = keyType;
  const PRIVATE_KEY = generatePrivate(testKeyType).toString("hex");
  describe(`Metadata - ${keyType}`, function () {
    it("#should serialize and deserialize into JSON seamlessly", async function () {
      const privKey = PRIVATE_KEY;
      const privKeyBN = new BN(privKey, 16);
      // create a random poly and respective shares
      const shareIndexes = [new BN(1), new BN(2)];
      for (let i = 1; i <= 2; i += 1) {
        let ran = generatePrivate(testKeyType);

        while (ran < 2) {
          ran = generatePrivate(testKeyType);
        }
        shareIndexes.push(new BN(ran));
      }
      const poly = generateRandomPolynomial(testKeyType, 1, privKeyBN);
      const shares = poly.generateShares(shareIndexes);
      const metadata = new Metadata(Point.fromPrivate(privKeyBN, testKeyType));
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
        let ran = generatePrivate(testKeyType);
        while (ran < 2) {
          ran = generatePrivate(testKeyType);
        }
        shareIndexes.push(new BN(ran));
      }
      const poly = generateRandomPolynomial(testKeyType, 1, privKeyBN);
      const shares = poly.generateShares(shareIndexes);
      const metadata = new Metadata(Point.fromPrivate(privKeyBN, testKeyType));
      metadata.addFromPolynomialAndShares(poly, shares);
      metadata.setTkeyStoreDomain("something", { test: "oh this is an object" });
      const serializedMetadata = stringify(metadata);
      const deserializedMetadata = Metadata.fromJSON(JSON.parse(serializedMetadata));
      const secondSerialization = stringify(deserializedMetadata);
      deepStrictEqual(serializedMetadata, secondSerialization, "serializedMetadata should be equal");
      const deserializedMetadata2 = Metadata.fromJSON(JSON.parse(secondSerialization));
      deepStrictEqual(deserializedMetadata2, deserializedMetadata, "metadata and deserializedMetadata should be equal");
    });
    it("#should serialize and deserialize into JSON with tkey store seamlessly 2", async function () {
      const privKey = PRIVATE_KEY;
      const privKeyBN = new BN(privKey, 16);
      // create a random poly and respective shares
      const shareIndexes = [new BN(1), new BN(2)];
      for (let i = 1; i <= 2; i += 1) {
        let ran = generatePrivate(testKeyType);
        while (ran < 2) {
          ran = generatePrivate(testKeyType);
        }
        shareIndexes.push(new BN(ran));
      }
      const poly = generateRandomPolynomial(testKeyType, 1, privKeyBN);
      const shares = poly.generateShares(shareIndexes);
      const metadata = new Metadata(Point.fromPrivate(privKeyBN, testKeyType));
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
});
