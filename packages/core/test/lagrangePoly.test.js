import { KeyType, Point, Polynomial } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { fail } from "assert";
import BN from "bn.js";

import { generateRandomPolynomial, lagrangeInterpolatePolynomial } from "../src/index";

const testKeyType = KeyType.secp256k1;
describe("lagrangeInterpolatePolynomial", function () {
  it("#should interpolate basic poly correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr, testKeyType);
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const resultPoly = lagrangeInterpolatePolynomial(
      [new Point(new BN(1), share1, testKeyType), new Point(new BN(2), share2, testKeyType)],
      testKeyType
    );
    if (polyArr[0].cmp(resultPoly.polynomial[0]) !== 0) {
      fail("poly result should equal hardcoded poly");
    }
    if (polyArr[1].cmp(resultPoly.polynomial[1]) !== 0) {
      fail("poly result should equal hardcoded poly");
    }
  });
  it("#should interpolate random poly correctly", async function () {
    const degree = Math.floor(Math.random() * (50 - 1)) + 1;
    const poly = generateRandomPolynomial(testKeyType, degree);
    const pointArr = [];
    for (let i = 0; i < degree + 1; i += 1) {
      const shareIndex = new BN(generatePrivate());
      pointArr.push(new Point(shareIndex, poly.polyEval(shareIndex), testKeyType));
    }
    const resultPoly = lagrangeInterpolatePolynomial(pointArr, testKeyType);
    resultPoly.polynomial.forEach(function (coeff, i) {
      if (poly.polynomial[i].cmp(coeff) !== 0) {
        fail("poly result should equal hardcoded poly");
      }
    });
  });
});
