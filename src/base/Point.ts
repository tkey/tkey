import BN from "bn.js";

import { BNString, IPoint } from "./commonTypes";

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
      return Buffer.concat([Buffer.from("0x04", "hex"), this.x.toBuffer("be", 32), this.y.toBuffer("be", 32)]);
    }
    throw Error("encoding doesnt exist in Point");
  }

  // toString(): string {
  //   return `{"x":"${this.x.toString("hex", 32)}","y":"${this.y.toString("hex", 32)}"}`;
  // }
}

export default Point;
