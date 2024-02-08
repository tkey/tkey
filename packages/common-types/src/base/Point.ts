import BN from "bn.js";
import { ec as EllipticCurve } from "elliptic";

import { BNString, IPoint, KeyType, StringifiedType, keyTypeToCurve } from "../baseTypes/commonTypes";

export class Point implements IPoint {
  ecCurve: EllipticCurve;

  keyType: KeyType;

  x: BN;

  y: BN;

  constructor(x: BNString, y: BNString, keyType: KeyType) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
    this.keyType = keyType;
    this.ecCurve = new EllipticCurve(keyType.toString());
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y, keyType } = value;

    let point: Point;

    if (keyType) {
      point = new Point(x, y, keyType);
    } else {
      point = new Point(x, y, KeyType.secp256k1);
    }

    return point;
  }

  static fromSEC1(value: string, keyType: KeyType): Point {
    const ecCurve = keyTypeToCurve(keyType);
    const key = ecCurve.keyFromPublic(value, "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY(), keyType);
  }

  static fromPrivate(privateKey: BNString, keyType: KeyType): Point {
    const ecCurve = keyTypeToCurve(keyType);
    const key = ecCurve.keyFromPrivate(privateKey.toString("hex"), "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY(), keyType);
  }

  toSEC1(compressed = false): string {
    return this.ecCurve.keyFromPublic({ x: this.x.toString("hex"), y: this.y.toString("hex") }).getPublic(compressed, "hex");
  }

  toJSON(): StringifiedType {
    return {
      x: this.x.toString("hex"),
      y: this.y.toString("hex"),
      keyType: this.keyType.toString(),
    };
  }
}

export default Point;
