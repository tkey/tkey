import BN from "bn.js";

// import { ec as EC } from "elliptic";
import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";
import { ecCurve } from "../utils";

class Point implements IPoint {
  x: BN;

  y: BN;

  constructor(x: BNString, y: BNString) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
  }

  getX() {
    return this.x;
  }

  getY() {
    return this.y;
  }

  // complies with EC and elliptic pub key types
  encode(enc: string, params?: any): Buffer {
    switch (enc) {
      case "arr":
        return Buffer.concat([
          Buffer.from("0x04", "hex"),
          Buffer.from(this.getX().toString("hex"), "hex"),
          Buffer.from(this.y.toString("hex"), "hex"),
        ]);
      case "elliptic-compressed": {
        let ec = params;
        ec = ecCurve;
        const key = ec.keyFromPublic({ x: this.getX().toString("hex"), y: this.y.toString("hex") }, "hex");
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
    };
  }

  static fromCompressedPub(value: string): Point {
    const key = ecCurve.keyFromPublic(value, "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY());
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y } = value;
    return new Point(x, y);
  }
}

export default Point;
