import { KeyType, keyTypeToCurve, Point } from "@tkey/common-types";
import { PointHex } from "@toruslabs/rss-client";
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";

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

export function generateSalt(ec: EC) {
  return ec.genKeyPair().getPrivate().toString("hex", 64);
}

export function getLagrangeCoeffs(ecCurve: EC, _allIndexes: number[] | BN[], _myIndex: number | BN, _target: number | BN = 0) {
  const allIndexes: BN[] = _allIndexes.map((i) => new BN(i));
  const myIndex: BN = new BN(_myIndex);
  const target: BN = new BN(_target);
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

export function lagrangeInterpolation(ecCurve: EC, shares: BN[], nodeIndex: BN[]) {
  if (shares.length !== nodeIndex.length) {
    return null;
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

export function pointToHex(p: Point): PointHex {
  return { x: p.x.toString(16, 64), y: p.y.toString(16, 64) };
}

export type BasePoint = curve.base.BasePoint;

export function pointToElliptic(ec: EC, p: Point): BasePoint {
  return ec.keyFromPublic(pointToHex(p)).getPublic();
}

export function getPubKeyPoint(s: BN, keyType: KeyType): Point {
  const ec = keyTypeToCurve(keyType);
  const p = (ec.g as BasePoint).mul(s);
  return Point.fromSEC1(p.encodeCompressed("hex"), keyType);
}

export const DELIMITERS = {
  Delimiter1: "\u001c",
  Delimiter2: "\u0015",
  Delimiter3: "\u0016",
  Delimiter4: "\u0017",
};

export function getExtendedVerifierId(verifierId: string, tssTag: string, tssNonce: number): string {
  return `${verifierId}${DELIMITERS.Delimiter2}${tssTag}${DELIMITERS.Delimiter3}${tssNonce}`;
}
