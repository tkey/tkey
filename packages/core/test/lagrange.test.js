import { generatePrivate, KeyType, Polynomial } from "@tkey/common-types";
import { fail } from "assert";
import BN from "bn.js";

import { generateRandomPolynomial, lagrangeInterpolation } from "../src/index";

const testKeyType = KeyType.secp256k1;

describe("lagrange interpolate", function () {
  it("#should interpolate secret correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr, testKeyType);
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const key = lagrangeInterpolation([share1, share2], [new BN(1), new BN(2)], testKeyType);
    if (key.cmp(new BN(5)) !== 0) {
      fail("poly result should equal 7");
    }
  });
  it("#should interpolate random secrets correctly", async function () {
    const degree = Math.ceil(Math.random() * 10);
    const secret = new BN(generatePrivate(testKeyType));
    const poly = generateRandomPolynomial(testKeyType, degree, secret);
    const shares = [];
    const indexes = [];
    for (let i = 1; i <= degree + 1; i += 1) {
      indexes.push(new BN(i));
      shares.push(poly.polyEval(new BN(i)));
    }
    const key = lagrangeInterpolation(shares, indexes, testKeyType);
    if (key.cmp(secret) !== 0) {
      fail("lagranged scalar should equal secret");
    }
  });
});
