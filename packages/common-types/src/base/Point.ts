import BN from "bn.js";

import { BNString, EllipticCurve, EllipticPoint, IPoint, StringifiedType } from "../baseTypes/commonTypes";
import { secp256k1 } from "../utils";

class Point implements IPoint {
  x: BN | null;

  y: BN | null;

  constructor(x: BNString, y: BNString) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
  }

  static fromScalar(s: BN, ec: EllipticCurve): Point {
    const p = (ec.g as EllipticPoint).mul(s);
    return Point.fromElliptic(p);
  }

  /**
   * @deprecated Use `fromSEC1` instead.
   */
  static fromCompressedPub(value: string): Point {
    const key = secp256k1.keyFromPublic(value, "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY());
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y } = value;
    return new Point(x, y);
  }

  static fromElliptic(p: EllipticPoint): Point {
    if (p.isInfinity()) {
      return new Point(null, null);
    }
    return new Point(p.getX(), p.getY());
  }

  /**
   * Construct a point from SEC1 format.
   */
  static fromSEC1(ec: EllipticCurve, encodedPoint: string): Point {
    // "elliptic"@6.5.4 can't decode identity.
    if (encodedPoint.length === 2 && encodedPoint === "00") {
      const identity = (ec.g as EllipticPoint).mul(new BN(0));
      return Point.fromElliptic(identity);
    }

    const key = ec.keyFromPublic(encodedPoint, "hex");
    const pt = key.getPublic();
    return Point.fromElliptic(pt);
  }

  /**
   * @deprecated Use `toSEC1` instead.
   *
   * complies with EC and elliptic pub key types
   */
  encode(enc: string): Buffer {
    switch (enc) {
      case "arr":
        return Buffer.concat([Buffer.from("0x04", "hex"), Buffer.from(this.x.toString("hex"), "hex"), Buffer.from(this.y.toString("hex"), "hex")]);
      case "elliptic-compressed": {
        const ec = secp256k1;
        const key = ec.keyFromPublic({ x: this.x.toString("hex"), y: this.y.toString("hex") }, "hex");
        return Buffer.from(key.getPublic(true, "hex"));
      }
      default:
        throw new Error("encoding doesnt exist in Point");
    }
  }

  toEllipticPoint(ec: EllipticCurve): EllipticPoint {
    if (this.isIdentity()) {
      return (ec.g as EllipticPoint).mul(new BN(0));
    }

    const keyPair = ec.keyFromPublic({ x: this.x.toString("hex"), y: this.y.toString("hex") }, "hex");
    return keyPair.getPublic();
  }

  /**
   * Returns this point encoded in SEC1 format.
   * @param ec - Curve which point is on.
   * @param compressed - Whether to use compressed format.
   * @returns The SEC1-encoded point.
   */
  toSEC1(ec: EllipticCurve, compressed = false): Buffer {
    // "elliptic"@6.5.4 can't encode identity.
    if (this.isIdentity()) {
      return Buffer.from("00", "hex");
    }

    const p = this.toEllipticPoint(ec);
    return Buffer.from(p.encode("hex", compressed), "hex");
  }

  toJSON(): StringifiedType {
    return {
      x: this.x.toString("hex"),
      y: this.y.toString("hex"),
    };
  }

  isIdentity(): boolean {
    return this.x === null && this.y === null;
  }

  equals(p: Point): boolean {
    if (this.isIdentity()) {
      return p.isIdentity();
    }
    return this.x.eq(p.x) && this.y.eq(p.y);
  }
}

export default Point;
