import { generatePrivate, KeyType, Point, Polynomial } from "@tkey/common-types";
import { fail } from "assert";
import BN from "bn.js";

import { generateRandomPolynomial, polyCommitmentEval } from "../src/index";

const testKeyType = KeyType.secp256k1;
describe("polyCommitmentEval", function () {
  it("#should polyCommitmentEval basic poly correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr, testKeyType);
    const publicPoly = poly.getPublicPolynomial();
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const expectedShareCommit1 = Point.fromPrivate(share1, testKeyType);
    const expectedShareCommit2 = Point.fromPrivate(share2, testKeyType);
    const shareCommit1 = polyCommitmentEval(publicPoly.polynomialCommitments, new BN(1), testKeyType);
    const shareCommit2 = polyCommitmentEval(publicPoly.polynomialCommitments, new BN(2), testKeyType);
    if (expectedShareCommit1.x.cmp(shareCommit1.x) !== 0) {
      fail("expected share commitment1 should equal share commitment");
    }
    if (expectedShareCommit2.x.cmp(shareCommit2.x) !== 0) {
      fail("expected share commitment2 should equal share commitment");
    }
  });
  it("#should polyCommitmentEval random poly correctly", async function () {
    const degree = Math.floor(Math.random() * (50 - 1)) + 1;
    const poly = generateRandomPolynomial(testKeyType, degree);
    const publicPoly = poly.getPublicPolynomial();
    const expectedShareCommitment = [];
    const shareCommitment = [];
    for (let i = 0; i < 10; i += 1) {
      const shareIndex = new BN(generatePrivate(testKeyType));
      expectedShareCommitment.push(Point.fromPrivate(poly.polyEval(shareIndex), testKeyType));
      shareCommitment.push(polyCommitmentEval(publicPoly.polynomialCommitments, shareIndex, testKeyType));
    }
    expectedShareCommitment.forEach(function (expected, i) {
      if (shareCommitment[i].x.cmp(expected.x) !== 0) {
        fail("poly result should equal hardcoded poly");
      }
    });
  });
});
