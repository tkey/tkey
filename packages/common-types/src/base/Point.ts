import BN from "bn.js";

import { BNString, IPoint, KeyType, keyTypeToCurve, StringifiedType } from "../baseTypes/commonTypes";

export class Point implements IPoint {
  keyType: KeyType;

  x: BN;

  y: BN;

  constructor(x: BNString, y: BNString, keyType: KeyType) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
    this.keyType = keyType;
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y, keyType } = value;
    return new Point(x, y, keyType in KeyType ? keyType : KeyType.secp256k1);
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
    const ecCurve = keyTypeToCurve(this.keyType);
    return ecCurve.keyFromPublic({ x: this.x.toString("hex"), y: this.y.toString("hex") }).getPublic(compressed, "hex");
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
