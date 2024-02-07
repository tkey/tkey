import BN from "bn.js";

import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";
import { ecCurve } from "../utils";

class Point implements IPoint {
  x: BN;

  y: BN;

  keyType: NamedCurve;

  constructor(x: BNString, y: BNString, keyType: NamedCurve) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
    this.keyType = keyType;
  }

  static fromCompressedPub(value: string, keyType: NamedCurve): Point {
    const key = ecCurve.keyFromPublic(value, "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY(), keyType);
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y, keyType } = value;
    return new Point(x, y, keyType);
  }

  // complies with EC and elliptic pub key types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encode(enc: string, params?: any): Buffer {
    switch (enc) {
      case "arr":
        return Buffer.concat([Buffer.from("0x04", "hex"), Buffer.from(this.x.toString("hex"), "hex"), Buffer.from(this.y.toString("hex"), "hex")]);
      case "elliptic-compressed": {
        // TODO: WHAT IS THIS.?
        let ec = params;
        ec = ecCurve;
        const key = ec.keyFromPublic({ x: this.x.toString("hex"), y: this.y.toString("hex") }, "hex");
        return Buffer.from(key.getPublic(true, "hex"));
      }
      default:
        throw new Error("encoding doesnt exist in Point");
    }
  }

  toJSON(): StringifiedType {
    return {
      x: this.x.toString("hex"),
      y: this.y.toString("hex"),
      keyType: this.keyType,
    };
  }
}

export default Point;
