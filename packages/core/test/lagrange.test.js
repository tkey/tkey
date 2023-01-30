import { Polynomial } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { getLagrangeCoeffs } from "@toruslabs/rss-client";
import { fail } from "assert";
import BN from "bn.js";

import { generateRandomPolynomial, lagrangeInterpolation } from "../src/index";

describe("lagrange interpolate", function () {
  it("#should interpolate secret correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const key = lagrangeInterpolation([share1, share2], [new BN(1), new BN(2)]);
    if (key.cmp(new BN(5)) !== 0) {
      fail("poly result should equal 7");
    }
  });
  it("#should interpolate random secrets correctly", async function () {
    const degree = Math.ceil(Math.random() * 10);
    const secret = new BN(generatePrivate());
    const poly = generateRandomPolynomial(degree, secret);
    const shares = [];
    const indexes = [];
    for (let i = 1; i <= degree + 1; i += 1) {
      indexes.push(new BN(i));
      shares.push(poly.polyEval(new BN(i)));
    }
    const key = lagrangeInterpolation(shares, indexes);
    if (key.cmp(secret) !== 0) {
      fail("lagranged scalar should equal secret");
    }
  });
  it("#should calculate coefficients correctly", async function () {
    const L1_0 = getLagrangeCoeffs([1, 2], 1, 0);
    const L2_0 = getLagrangeCoeffs([1, 2], 2, 0);
    if (L1_0.cmp(new BN(2)) !== 0) {
      fail("Incorrect coefficient");
    }
    if (L2_0.cmp(new BN("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140", 16)) !== 0) {
      fail("Incorrect coefficient");
    }
  });
});
