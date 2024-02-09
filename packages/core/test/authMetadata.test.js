import { generatePrivateExcludingIndexes, getPubKeyPoint, KeyType, keyTypeToCurve } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { deepStrictEqual } from "assert";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import { AuthMetadata, generateRandomPolynomial, Metadata } from "../src/index";

const PRIVATE_KEY = generatePrivate().toString("hex");
const testKeyType = KeyType.secp256k1;

describe.only("AuthMetadata", function () {
  it("#should authenticate and  serialize and deserialize into JSON seamlessly", async function () {
    const privKeyBN = new BN(PRIVATE_KEY, 16);
    // create a random poly and respective shares
    const ecCurve = keyTypeToCurve(testKeyType);
    console.log("reach here")
    const shareIndexes = [new BN(1), new BN(2)];
    shareIndexes.push(generatePrivateExcludingIndexes(shareIndexes, ecCurve));
    console.log("reach here")
    const poly = generateRandomPolynomial(1, ecCurve, privKeyBN);
    const shares = poly.generateShares(shareIndexes);
    console.log("reach here")
    const metadata = new Metadata(getPubKeyPoint(privKeyBN), testKeyType);
    metadata.addFromPolynomialAndShares(poly, shares);
    metadata.setGeneralStoreDomain("something", { test: "oh this is an object" });
    const a = new AuthMetadata(testKeyType, metadata, privKeyBN);
    console.log(a)

    const stringified = stringify(a);
    const metadataSerialized = Metadata.fromJSON(JSON.parse(stringify(metadata)));
    const final = AuthMetadata.fromJSON(JSON.parse(stringified));
    deepStrictEqual(final.metadata, metadataSerialized, "Must be equal");
  });
});
