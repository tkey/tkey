import BN from "bn.js";

import { ec } from "elliptic";
import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";

enum KeyType {
  "secp256k1",
  "ed25519",
}

class Point implements IPoint {
  ecCurve: ec;

  keyType: KeyType;

  x: BN;

  y: BN;

  constructor(x: BNString, y: BNString, keyType: KeyType) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
    this.keyType = keyType;
    this.ecCurve = new ec(keyType.toString());
  }

  static fromSEC1(value: string, keyType: KeyType): Point {
    const key = ecCurve.keyFromPublic(value, "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY(), keyType);
  }

  toSEC1(compressed = false): string {
    return ecCurve.keyFromPublic({ x: this.x, y: this.y }).getPublic(compressed, "hex");
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

  toJSON(): StringifiedType {
    return {
      x: this.x.toString("hex"),
      y: this.y.toString("hex"),
      keyType: this.keyType.toString(),
    };
  }
}

export default Point;
