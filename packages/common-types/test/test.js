import { generatePrivate } from "@toruslabs/eccrypto";
import { fail } from "assert";
import BN from "bn.js";

import { getPubKeyPoint, Point, Polynomial } from "../src/base";
import { secp256k1 } from "../src/utils";

describe("polynomial", function () {
  it("#should polyEval indexes correctly", async function () {
    const polyArr = [new BN(5), new BN(2)];
    const poly = new Polynomial(polyArr);
    const result = poly.polyEval(new BN(1));
    if (result.cmp(new BN(7)) !== 0) {
      fail("poly result should equal 7");
    }
  });
});

describe("Point", function () {
  it("#should encode into elliptic format on encode", async function () {
    const secret = new BN(generatePrivate());
    const point = getPubKeyPoint(secret);
    const result = point.toSEC1(secp256k1, true);
    if (result.toString("hex").slice(2) !== point.x.toString("hex", 64)) {
      fail(`elliptic format x should be equal ${secret} ${result.toString("hex")} ${point.x.toString("hex")} ${secret.umod(secp256k1.n)}`);
    }
  });

  it("#should decode into point for elliptic format compressed", async function () {
    const secret = new BN(generatePrivate());
    const point = getPubKeyPoint(secret);
    const result = point.toSEC1(secp256k1, true);
    if (result.toString("hex").slice(2) !== point.x.toString("hex", 64)) {
      fail("elliptic format x should be equal");
    }
    const key = secp256k1.keyFromPublic(result.toString("hex"), "hex");
    if (point.x.cmp(key.pub.x) !== 0) {
      fail(" x should be equal");
    }
    if (point.y.cmp(key.pub.y) !== 0) {
      fail(" x should be equal");
    }
  });

  it("#should decode into point for fromSEC1", async function () {
    const secret = new BN(generatePrivate());
    const point = getPubKeyPoint(secret);
    const result = point.toSEC1(secp256k1, true);
    if (result.toString("hex").slice(2) !== point.x.toString("hex", 64)) {
      fail("elliptic format x should be equal");
    }

    const key = Point.fromSEC1(secp256k1, result.toString("hex"));
    if (point.x.cmp(key.x) !== 0) {
      fail(" x should be equal");
    }
    if (point.y.cmp(key.y) !== 0) {
      fail(" x should be equal");
    }
  });
});
