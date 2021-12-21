import { getPubKeyPoint, Polynomial } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import { fail } from "assert";
import BN from "bn.js";

import { generateRandomPolynomial, polyCommitmentEval } from "../src/index";

describe("polyCommitmentEval", function () {
  it("#should polyCommitmentEval basic poly correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const publicPoly = poly.getPublicPolynomial();
    const share1 = poly.polyEval(new BN(1));
    const share2 = poly.polyEval(new BN(2));
    const expectedShareCommit1 = getPubKeyPoint(share1);
    const expectedShareCommit2 = getPubKeyPoint(share2);
    const shareCommit1 = polyCommitmentEval(publicPoly.polynomialCommitments, new BN(1));
    const shareCommit2 = polyCommitmentEval(publicPoly.polynomialCommitments, new BN(2));
    if (expectedShareCommit1.x.cmp(shareCommit1.x) !== 0) {
      fail("expected share commitment1 should equal share commitment");
    }
    if (expectedShareCommit2.x.cmp(shareCommit2.x) !== 0) {
      fail("expected share commitment2 should equal share commitment");
    }
  });
  it("#should polyCommitmentEval random poly correctly", async function () {
    const degree = Math.floor(Math.random() * (50 - 1)) + 1;
    const poly = generateRandomPolynomial(degree);
    const publicPoly = poly.getPublicPolynomial();
    const expectedShareCommitment = [];
    const shareCommitment = [];
    for (let i = 0; i < 10; i += 1) {
      const shareIndex = new BN(generatePrivate());
      expectedShareCommitment.push(getPubKeyPoint(poly.polyEval(shareIndex)));
      shareCommitment.push(polyCommitmentEval(publicPoly.polynomialCommitments, shareIndex));
    }
    expectedShareCommitment.forEach(function (expected, i) {
      if (shareCommitment[i].x.cmp(expected.x) !== 0) {
        fail("poly result should equal hardcoded poly");
      }
    });
  });
});
