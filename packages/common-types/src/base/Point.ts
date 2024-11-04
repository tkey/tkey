import { Hex, hexToNumber } from "@noble/curves/abstract/utils";
import { ed25519 } from "@noble/curves/ed25519";
import { secp256k1 } from "@noble/curves/secp256k1";

import { IPoint, StringifiedType } from "../baseTypes/commonTypes";
import { strip0x } from "../utils";

export enum curveType {
  "secp256k1" = "secp256k1",
  "ed25519" = "ed25519",
}

export class PointBigInt {
  x: bigint;

  y: bigint;

  constructor(x: bigint, y: bigint) {
    this.x = x;
    this.y = y;
  }
}

class Point implements IPoint {
  x: bigint | null;

  y: bigint | null;

  constructor(x: bigint, y: bigint) {
    this.x = x;
    this.y = y;
  }

  static fromScalar(curve: curveType, s: Hex): Point {
    if (curve === "secp256k1") {
      const point = secp256k1.ProjectivePoint.fromPrivateKey(s);
      return new Point(point.x, point.y);
    }

    if (curve === "ed25519") {
      const point = ed25519.ExtendedPoint.fromPrivateKey(s);
      return new Point(point.x, point.y);
    }

    throw new Error("curve not supported");
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y } = value;
    return new Point(hexToNumber(x), hexToNumber(y));
  }

  /**
   * Construct a point from SEC1 format.
   */
  static fromSEC1(curve: curveType, encodedPoint: string): Point {
    const encodedHex = strip0x(encodedPoint);
    if (curve === "secp256k1") {
      const point = secp256k1.ProjectivePoint.fromHex(encodedHex);
      return new Point(point.x, point.y);
    }

    if (curve === "ed25519") {
      const point = ed25519.ExtendedPoint.fromHex(encodedHex);
      return new Point(point.x, point.y);
    }

    throw new Error("unknown curve type");
  }

  /**
   * Returns this point encoded in SEC1 format.
   * @param ec - Curve which point is on.
   * @param compressed - Whether to use compressed format.
   * @returns The SEC1-encoded point.
   */
  toSEC1(ec: curveType, compressed = false): Uint8Array {
    if (ec === "secp256k1") {
      const point = secp256k1.ProjectivePoint.fromAffine({ x: this.x, y: this.y });
      return point.toRawBytes(compressed);
    }

    if (ec === "ed25519") {
      const point = ed25519.ExtendedPoint.fromAffine({ x: this.x, y: this.y });
      return point.toRawBytes(compressed);
    }
  }

  toJSON(): StringifiedType {
    return {
      x: this.x.toString(16),
      y: this.y.toString(16),
    };
  }

  isIdentity(): boolean {
    return this.x === null && this.y === null;
  }

  equals(p: Point): boolean {
    // if (this.isIdentity()) {
    //   return p.isIdentity();
    // }
    return this.x === p.x && this.y === p.y;
  }
}

export default Point;
