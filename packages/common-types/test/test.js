import { fail } from "assert";
import BN from "bn.js";

import { getPubKeyPoint, Point, Polynomial } from "../src/base";
import { KeyType, keyTypeToCurve } from "../src/baseTypes/commonTypes";
import { generatePrivate } from "../src/utils"

const testKeyType = KeyType.secp256k1;
describe("polynomial", function () {
  it("#should polyEval indexes correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr, testKeyType);
    const result = poly.polyEval(new BN(1));
    if (result.cmp(new BN(7)) !== 0) {
      fail("poly result should equal 7");
    }
  });
});

describe("Point", function () {
  it("#should encode into elliptic format on encode", async function () {
    const ecCurve = keyTypeToCurve(testKeyType);
    const secret = generatePrivate(ecCurve);
    const point = Point.fromPrivate(secret, testKeyType);
    const result = point.toSEC1(true);
    if (result.toString().slice(2) !== point.x.toString("hex", 64)) {
      fail(`elliptic format x should be equal ${secret} ${result.toString()} ${point.x.toString("hex")} ${secret.umod(ecCurve.n)}`);
    }
  });
  it("#should decode into point for elliptic format compressed", async function () {
    const ecCurve = keyTypeToCurve(testKeyType);
    const secret = generatePrivate(ecCurve);
    const point = Point.fromPrivate(secret, testKeyType);
    const result = point.toSEC1(true);
    if (result.toString().slice(2) !== point.x.toString("hex", 64)) {
      fail("elliptic format x should be equal");
    }
    const key = ecCurve.keyFromPublic(result.toString(), "hex");
    if (point.x.cmp(key.pub.x) !== 0) {
      fail(" x should be equal");
    }
    if (point.y.cmp(key.pub.y) !== 0) {
      fail(" x should be equal");
    }
  });
  it("#should decode into point for fromCompressedPub", async function () {
    const ecCurve = keyTypeToCurve(testKeyType);
    const secret = generatePrivate(ecCurve);
    const point = Point.fromPrivate(secret, testKeyType);
    const result = point.toSEC1(true);
    if (result.toString().slice(2) !== point.x.toString("hex", 64)) {
      fail("elliptic format x should be equal");
    }

    const key = Point.fromSEC1(result.toString(), testKeyType);
    if (point.x.cmp(key.x) !== 0) {
      fail(" x should be equal");
    }
    if (point.y.cmp(key.y) !== 0) {
      fail(" x should be equal");
    }
  });
});
