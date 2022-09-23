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

// const lagrangePublicPoly = (indexes: BN[], pks: Point[]) => {
//   const sortedPoints = pointSort(unsortedPoints);
//   const polynomial = generateEmptyBNArray(sortedPoints.length);
//   for (let i = 0; i < sortedPoints.length; i += 1) {
//     const coefficients = interpolationPoly(i, sortedPoints);
//     for (let k = 0; k < sortedPoints.length; k += 1) {
//       let tmp = new BN(sortedPoints[i].y);
//       tmp = tmp.mul(coefficients[k]);
//       polynomial[k] = polynomial[k].add(tmp);
//       polynomial[k] = polynomial[k].umod(ecCurve.curve.n);
//     }
//   }
//   return new Polynomial(polynomial);
// };

// TODO: rename to lagrangeInterpolateSharePoly
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

// we have two points g^s1, g^s2 (or even g^x) | we want to figure out what is the evaluation for a polynomial that goes through both points
// export function generatePublicPolyFromShareCommitments(shareCommitments: Array<Point>, index: BN): Point {
//   // convert to base points, this is badly written, its the only way to access the point rn zzz TODO: refactor
//   const basePtPolyCommitments: Array<curve.base.BasePoint> = [];
//   for (let i = 0; i < polyCommitments.length; i += 1) {
//     const key = ecCurve.keyFromPublic({ x: polyCommitments[i].x.toString("hex"), y: polyCommitments[i].y.toString("hex") }, "");
//     basePtPolyCommitments.push(key.getPublic());
//   }
//   let shareCommitment = basePtPolyCommitments[0];
//   for (let i = 1; i < basePtPolyCommitments.length; i += 1) {
//     const factor = index.pow(new BN(i)).umod(ecCurve.n);
//     const e = basePtPolyCommitments[i].mul(factor);
//     shareCommitment = shareCommitment.add(e);
//   }
//   return new Point(shareCommitment.getX(), shareCommitment.getY());
// }

const lagrangePublicCommitments = (indexes: BN[], polys: curve.base.BasePoint[][]): Point[] => {
  if (indexes.length !== polys.length) {
    throw new Error("Indexes and poly needs to be equal length in lagrangePublicPoints");
  }
  const res = [];
  for (let l = 0; l < polys[0].length; l++) {
    let sum: curve.base.BasePoint;
    for (let j = 0; j < indexes.length; j++) {
      const index = indexes[j];
      // let lambda = new BN(1);
      let upper = new BN(1);
      let lower = new BN(1);
      for (let z = 0; z < indexes.length; z++) {
        const otherIndex = indexes[z];
        if (otherIndex !== index) {
          let tempUpper = new BN(0);
          tempUpper = tempUpper.sub(new BN(otherIndex));
          upper = upper.mul(tempUpper);
          upper = upper.umod(ecCurve.curve.n);

          let tempLower = new BN(index);
          tempLower = tempLower.sub(otherIndex);
          tempLower = tempLower.umod(ecCurve.curve.n);

          lower = lower.mul(tempLower);
          lower = lower.umod(ecCurve.curve.n);
        }
      }
      const inv = lower.invm(ecCurve.curve.n);
      let lambda = upper.mul(inv);
      lambda = lambda.umod(ecCurve.curve.n);
      const tmpPt = polys[j][l].mul(lambda);
      if (sum) {
        sum = sum.add(tmpPt);
      } else {
        sum = tmpPt;
      }
    }
    res.push(sum);
  }
  return res;
};

export function lagrangePublicPoints(indexes: BN[], points: Point[]): Point {
  const sm: curve.base.BasePoint[][] = [];
  for (let i = 0; i < points.length; i++) {
    const pk = ecCurve.keyFromPublic({ x: points[i].x.toString("hex"), y: points[i].y.toString("hex") }, "");
    sm.push([pk.getPublic()]);
  }
  const res = lagrangePublicCommitments(indexes, sm);
  return res[0];
}

// // LagrangeCurvePts finds the ^0 coefficient for points given in points an indexes given
// func LagrangeCurvePts(indexes []int, points []common.Point) *common.Point {
// 	var sm [][]common.Point
// 	for i := 0; i < len(points); i++ {
// 		var temp []common.Point
// 		temp = append(temp, points[i])
// 		sm = append(sm, temp)
// 	}
// 	poly := LagrangePolys(indexes, sm)
// 	return &poly[0]
// }

// LagrangePolys is used in PSS
// When each share is subshared, each share is associated with a commitment polynomial
// we then choose k such subsharings to form the refreshed shares and secrets
// those refreshed shares are lagrange interpolated, but they also correspond to a langrage
// interpolated polynomial commitment that is different from the original commitment
// here, we calculate this interpolated polynomial commitment
// func LagrangePolys(indexes []int, polys [][]common.Point) (res []common.Point) {
// 	if len(polys) == 0 {
// 		return
// 	}
// 	if len(indexes) != len(polys) {
// 		return
// 	}
// 	for l := 0; l < len(polys[0]); l++ {
// 		sum := common.Point{X: *big.NewInt(int64(0)), Y: *big.NewInt(int64(0))}
// 		for j, index := range indexes {
// 			lambda := new(big.Int).SetInt64(int64(1))
// 			upper := new(big.Int).SetInt64(int64(1))
// 			lower := new(big.Int).SetInt64(int64(1))
// 			for _, otherIndex := range indexes {
// 				if otherIndex != index {
// 					tempUpper := big.NewInt(int64(0))
// 					tempUpper.Sub(tempUpper, big.NewInt(int64(otherIndex)))
// 					upper.Mul(upper, tempUpper)
// 					upper.Mod(upper, secp256k1.GeneratorOrder)

// 					tempLower := big.NewInt(int64(index))
// 					tempLower.Sub(tempLower, big.NewInt(int64(otherIndex)))
// 					tempLower.Mod(tempLower, secp256k1.GeneratorOrder)

// 					lower.Mul(lower, tempLower)
// 					lower.Mod(lower, secp256k1.GeneratorOrder)
// 				}
// 			}
// 			// finite field division
// 			inv := new(big.Int)
// 			inv.ModInverse(lower, secp256k1.GeneratorOrder)
// 			lambda.Mul(upper, inv)
// 			lambda.Mod(lambda, secp256k1.GeneratorOrder)
// 			tempPt := common.BigIntToPoint(secp256k1.Curve.ScalarMult(&polys[j][l].X, &polys[j][l].Y, lambda.Bytes()))
// 			sum = common.BigIntToPoint(secp256k1.Curve.Add(&tempPt.X, &tempPt.Y, &sum.X, &sum.Y))
// 		}
// 		res = append(res, sum)
// 	}
// 	return
// }
