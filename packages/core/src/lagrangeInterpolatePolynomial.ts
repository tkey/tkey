import { ecCurve, generatePrivateExcludingIndexes, Point, Polynomial, Share } from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";
import { curve } from "elliptic";

import CoreError from "./errors";

const generateEmptyBNArray = (length: number): BN[] => Array.from({ length }, () => new BN(0));

const denominator = (i: number, innerPoints: Array<Point>) => {
  let result = new BN(1);
  const xi = innerPoints[i].x;
  for (let j = innerPoints.length - 1; j >= 0; j -= 1) {
    if (i !== j) {
      let tmp = new BN(xi);
      tmp = tmp.sub(innerPoints[j].x);
      tmp = tmp.umod(ecCurve.curve.n);
      result = result.mul(tmp);
      result = result.umod(ecCurve.curve.n);
    }
  }
  return result;
};

const interpolationPoly = (i: number, innerPoints: Array<Point>): BN[] => {
  let coefficients = generateEmptyBNArray(innerPoints.length);
  const d = denominator(i, innerPoints);
  if (d.cmp(new BN(0)) === 0) {
    throw CoreError.default("Denominator for interpolationPoly is 0");
  }
  coefficients[0] = d.invm(ecCurve.curve.n);
  for (let k = 0; k < innerPoints.length; k += 1) {
    const newCoefficients = generateEmptyBNArray(innerPoints.length);
    if (k !== i) {
      let j: number;
      if (k < i) {
        j = k + 1;
      } else {
        j = k;
      }
      j -= 1;
      for (; j >= 0; j -= 1) {
        newCoefficients[j + 1] = newCoefficients[j + 1].add(coefficients[j]);
        newCoefficients[j + 1] = newCoefficients[j + 1].umod(ecCurve.curve.n);
        let tmp = new BN(innerPoints[k].x);
        tmp = tmp.mul(coefficients[j]);
        tmp = tmp.umod(ecCurve.curve.n);
        newCoefficients[j] = newCoefficients[j].sub(tmp);
        newCoefficients[j] = newCoefficients[j].umod(ecCurve.curve.n);
      }
      coefficients = newCoefficients;
    }
  }
  return coefficients;
};

const pointSort = (innerPoints: Point[]): Point[] => {
  const pointArrClone = [...innerPoints];
  pointArrClone.sort((a, b) => a.x.cmp(b.x));
  return pointArrClone;
};

const lagrange = (unsortedPoints: Point[]) => {
  const sortedPoints = pointSort(unsortedPoints);
  const polynomial = generateEmptyBNArray(sortedPoints.length);
  for (let i = 0; i < sortedPoints.length; i += 1) {
    const coefficients = interpolationPoly(i, sortedPoints);
    for (let k = 0; k < sortedPoints.length; k += 1) {
      let tmp = new BN(sortedPoints[i].y);
      tmp = tmp.mul(coefficients[k]);
      polynomial[k] = polynomial[k].add(tmp);
      polynomial[k] = polynomial[k].umod(ecCurve.curve.n);
    }
  }
  return new Polynomial(polynomial);
};

export function lagrangeInterpolatePolynomial(points: Array<Point>): Polynomial {
  return lagrange(points);
}

export function lagrangeInterpolation(shares: BN[], nodeIndex: BN[]): BN {
  if (shares.length !== nodeIndex.length) {
    throw CoreError.default("shares not equal to nodeIndex length in lagrangeInterpolation");
  }
  let secret = new BN(0);
  for (let i = 0; i < shares.length; i += 1) {
    let upper = new BN(1);
    let lower = new BN(1);
    for (let j = 0; j < shares.length; j += 1) {
      if (i !== j) {
        upper = upper.mul(nodeIndex[j].neg());
        upper = upper.umod(ecCurve.curve.n);
        let temp = nodeIndex[i].sub(nodeIndex[j]);
        temp = temp.umod(ecCurve.curve.n);
        lower = lower.mul(temp).umod(ecCurve.curve.n);
      }
    }
    let delta = upper.mul(lower.invm(ecCurve.curve.n)).umod(ecCurve.curve.n);
    delta = delta.mul(shares[i]).umod(ecCurve.curve.n);
    secret = secret.add(delta);
  }
  return secret.umod(ecCurve.curve.n);
}

// generateRandomPolynomial - determinisiticShares are assumed random
export function generateRandomPolynomial(degree: number, secret?: BN, deterministicShares?: Array<Share>): Polynomial {
  let actualS = secret;
  if (!secret) {
    actualS = generatePrivateExcludingIndexes([new BN(0)]);
  }
  if (!deterministicShares) {
    const poly = [actualS];
    for (let i = 0; i < degree; i += 1) {
      const share = generatePrivateExcludingIndexes(poly);
      poly.push(share);
    }
    return new Polynomial(poly);
  }
  if (!Array.isArray(deterministicShares)) {
    throw CoreError.default("deterministic shares in generateRandomPolynomial should be an array");
  }

  if (deterministicShares.length > degree) {
    throw CoreError.default("deterministicShares in generateRandomPolynomial should be less or equal than degree to ensure an element of randomness");
  }
  const points = {};
  deterministicShares.forEach((share) => {
    points[share.shareIndex.toString("hex")] = new Point(share.shareIndex, share.share);
  });
  for (let i = 0; i < degree - deterministicShares.length; i += 1) {
    let shareIndex = generatePrivateExcludingIndexes([new BN(0)]);
    while (points[shareIndex.toString("hex")] !== undefined) {
      shareIndex = generatePrivateExcludingIndexes([new BN(0)]);
    }
    points[shareIndex.toString("hex")] = new Point(shareIndex, new BN(generatePrivate()));
  }
  points["0"] = new Point(new BN(0), actualS);
  return lagrangeInterpolatePolynomial(Object.values(points));
}

//  2 + 3x = y | secret for index 1 is 5 >>> g^5 is the commitment | now we have g^2, g^3 and 1, |
export function polyCommitmentEval(polyCommitments: Array<Point>, index: BN): Point {
  // convert to base points, this is badly written, its the only way to access the point rn zzz TODO: refactor
  const basePtPolyCommitments: Array<curve.base.BasePoint> = [];
  for (let i = 0; i < polyCommitments.length; i += 1) {
    const key = ecCurve.keyFromPublic({ x: polyCommitments[i].x.toString("hex"), y: polyCommitments[i].y.toString("hex") }, "");
    basePtPolyCommitments.push(key.getPublic());
  }
  let shareCommitment = basePtPolyCommitments[0];
  for (let i = 1; i < basePtPolyCommitments.length; i += 1) {
    const factor = index.pow(new BN(i)).umod(ecCurve.n);
    const e = basePtPolyCommitments[i].mul(factor);
    shareCommitment = shareCommitment.add(e);
  }
  return new Point(shareCommitment.getX(), shareCommitment.getY());
}

export function dotProduct(arr1: BN[], arr2: BN[], modulus = new BN(0)) {
  if (arr1.length !== arr2.length) {
    throw new Error("arrays of different lengths");
  }
  let sum = new BN(0);
  for (let i = 0; i < arr1.length; i++) {
    sum = sum.add(arr1[i].mul(arr2[i]));
    if (modulus.cmp(new BN(0)) !== 0) {
      sum = sum.umod(modulus);
    }
  }
  return sum;
}

export const kCombinations = (s: number | number[], k: number): number[][] => {
  let set = s;
  if (typeof set === "number") {
    set = Array.from({ length: set }, (_, i) => i);
  }
  if (k > set.length || k <= 0) {
    return [];
  }

  if (k === set.length) {
    return [set];
  }

  if (k === 1) {
    return set.reduce((acc, cur) => [...acc, [cur]], [] as number[][]);
  }

  const combs: number[][] = [];
  let tailCombs: number[][] = [];

  for (let i = 0; i <= set.length - k + 1; i += 1) {
    tailCombs = kCombinations(set.slice(i + 1), k - 1);
    for (let j = 0; j < tailCombs.length; j += 1) {
      combs.push([set[i], ...tailCombs[j]]);
    }
  }

  return combs;
};

export function getLagrangeCoeffs(_allIndexes, _myIndex, _target = 0) {
  const allIndexes = _allIndexes.map((i) => new BN(i));
  const myIndex = new BN(_myIndex);
  const target = new BN(_target);
  let upper = new BN(1);
  let lower = new BN(1);
  for (let j = 0; j < allIndexes.length; j += 1) {
    if (myIndex.cmp(allIndexes[j]) !== 0) {
      let tempUpper = target.sub(allIndexes[j]);
      tempUpper = tempUpper.umod(ecCurve.curve.n);
      upper = upper.mul(tempUpper);
      upper = upper.umod(ecCurve.curve.n);
      let tempLower = myIndex.sub(allIndexes[j]);
      tempLower = tempLower.umod(ecCurve.curve.n);
      lower = lower.mul(tempLower).umod(ecCurve.curve.n);
    }
  }
  return upper.mul(lower.invm(ecCurve.curve.n)).umod(ecCurve.curve.n);
}
