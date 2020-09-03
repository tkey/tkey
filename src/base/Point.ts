import BN from "bn.js";

import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";

class Point implements IPoint {
  x: BN;

  y: BN;

  constructor(x: BNString, y: BNString) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
  }

  // complies with EC point pub key  encoding api
  encode(enc: "arr"): Buffer {
    if (enc === "arr") {
      return Buffer.concat([Buffer.from("0x04", "hex"), Buffer.from(this.x.toString("hex"), "hex"), Buffer.from(this.y.toString("hex"), "hex")]);
    }
    throw new Error("encoding doesnt exist in Point");
  }

  toJSON(): StringifiedType {
    return {
      x: this.x.toString("hex"),
      y: this.y.toString("hex"),
    };
  }

  static fromJSON(value: StringifiedType): Point {
    const { x, y } = value;
    return new Point(x, y);
  }
}

export default Point;
