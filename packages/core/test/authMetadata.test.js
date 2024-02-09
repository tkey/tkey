import { generatePrivateExcludingIndexes, KeyType, Point } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { deepStrictEqual } from "assert";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import { AuthMetadata, generateRandomPolynomial, Metadata } from "../src/index";

const PRIVATE_KEY = generatePrivate().toString("hex");

describe("AuthMetadata", function () {
  it("#should authenticate and  serialize and deserialize into JSON seamlessly", async function () {
    const testKeyType = KeyType.secp256k1;
    const privKeyBN = new BN(PRIVATE_KEY, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    shareIndexes.push(generatePrivateExcludingIndexes(shareIndexes, testKeyType));
    const poly = generateRandomPolynomial(testKeyType, 1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(Point.fromPrivate(privKeyBN, testKeyType));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });
    const a = new AuthMetadata(testKeyType, metadata, privKeyBN);

    const stringified = stringify(a);
    const metadataSerialized = Metadata.fromJSON(JSON.parse(stringify(metadata)));
    const final = AuthMetadata.fromJSON(JSON.parse(stringified));
    deepStrictEqual(final.metadata, metadataSerialized, "Must be equal");
  });

  it("#should authenticate and  serialize and deserialize into JSON seamlessly - ed25519", async function () {
    const testKeyType = KeyType.ed25519;
    const privKeyBN = new BN(PRIVATE_KEY, 16);
    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    shareIndexes.push(generatePrivateExcludingIndexes(shareIndexes, testKeyType));
    const poly = generateRandomPolynomial(testKeyType, 1, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    const metadata = new Metadata(Point.fromPrivate(privKeyBN, testKeyType));
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });
    const a = new AuthMetadata(testKeyType, metadata, privKeyBN);

    const stringified = stringify(a);
    const metadataSerialized = Metadata.fromJSON(JSON.parse(stringify(metadata)));
    const final = AuthMetadata.fromJSON(JSON.parse(stringified));
    deepStrictEqual(final.metadata, metadataSerialized, "Must be equal");
  });
});
