/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
import BN from "bn.js";
import { getPublic } from "eccrypto";
import { curve, ec } from "elliptic";

import { ecCurve } from "../utils";

BN.prototype.toPrivKeyEC = function toPrivKeyEC(): ec.KeyPair {
  return ecCurve.keyFromPrivate(this.toString("hex", 64));
};

BN.prototype.toPrivKeyECC = function toPrivKeyECC(): Buffer {
  const tmp = new BN("be", "hex");
  return Buffer.from(tmp.toString("hex", 64), "hex");
};

BN.prototype.getPubKeyEC = function getPubKeyEC(): curve.base.BasePoint {
  return ecCurve.keyFromPrivate(this.toString("hex", 64)).getPublic();
};

BN.prototype.getPubKeyECC = function getPubKeyECC(): Buffer {
  return getPublic(this.toPrivKeyECC());
};

BN.prototype.getPubKeyPoint = function getPubKeyPoint(): Point {
  return new Point(new BN(this.getPubKeyEC().getX().toString("hex"), "hex"), new BN(this.getPubKeyEC().getY().toString("hex"), "hex"));
};

class Point {
  x: BN;

  y: BN;

  constructor(x: BN, y: BN) {
    if (x instanceof BN && y instanceof BN) {
      this.x = x;
      this.y = y;
    } else if (typeof x === "string" && typeof y === "string") {
      this.x = new BN(x, "hex");
      this.y = new BN(y, "hex");
    } else {
      throw TypeError("Point needs to be intialized with BN");
    }
  }

  // complies with EC point pub key  encoding api
  encode(enc: "arr"): Buffer {
    if (enc === "arr") {
      return Buffer.concat([Buffer.from("0x04", "hex"), this.x.toBuffer("be", 32), this.y.toBuffer("be", 32)]);
    }
    throw Error("encoding doesnt exist in Point");
  }
}

export { BN, Point };
