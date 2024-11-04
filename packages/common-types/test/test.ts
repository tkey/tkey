import { describe, it } from "node:test";

import { bytesToHex, bytesToNumberBE } from "@noble/curves/abstract/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { fail } from "assert";

import { Point, Polynomial } from "../src/base";
import { curveType } from "../src/base/Point";
describe("common types", function () {
  describe("polynomial", function () {
    it("#should polyEval indexes correctly", async function () {
      const polyArr = [BigInt(5), BigInt(2)];
      const poly = new Polynomial(polyArr);
      const result = poly.polyEval(BigInt(1));
      if (result !== BigInt(7)) {
        fail("poly result should equal 7");
      }
    });
  });

  describe("Point", function () {
    it("#should encode into elliptic format on encode", async function () {
      const secret = secp256k1.utils.randomPrivateKey();
      const point = Point.fromScalar(curveType.secp256k1, bytesToHex(secret));
      const result = point.toSEC1(curveType.secp256k1, true);
      if (bytesToNumberBE(result.subarray(1)) !== point.x) {
        fail(`elliptic format x should be equal ${secret} ${result} ${point.x} `);
      }
    });

    it("#should decode into point for elliptic format compressed", async function () {
      const secret = secp256k1.utils.randomPrivateKey();
      const point = Point.fromScalar(curveType.secp256k1, bytesToHex(secret));
      const result = point.toSEC1(curveType.secp256k1, true);
      if (bytesToNumberBE(result.subarray(1)) !== point.x) {
        fail("elliptic format x should be equal");
      }
      const key = secp256k1.ProjectivePoint.fromHex(result);
      if (point.x !== key.x) {
        fail(" x should be equal");
      }
      if (point.y !== key.y) {
        fail(" x should be equal");
      }
    });

    it("#should decode into point for fromSEC1", async function () {
      const secret = secp256k1.utils.randomPrivateKey();
      const point = Point.fromScalar(curveType.secp256k1, bytesToHex(secret));
      const result = point.toSEC1(curveType.secp256k1, false);
      if (bytesToNumberBE(result.subarray(1, 33)) !== point.x) {
        fail("elliptic format x should be equal");
      }
      const key = secp256k1.ProjectivePoint.fromHex(result);
      if (point.x !== key.x) {
        fail(" x should be equal");
      }
      if (point.y !== key.y) {
        fail(" x should be equal");
      }
    });
  });
});
