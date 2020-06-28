const BN = require("bn.js");
const { ecCurve } = require("./utils");
const { getPublic } = require("eccrypto");

// This is done because we can't extend BN
BN.prototype.toPrivKeyECC = function () {
  return this.toBuffer("be", 32);
};
BN.prototype.getPubKeyEC = function () {
  return ecCurve.keyFromPrivate(this.toString("hex", 64)).getPublic();
};
BN.prototype.getPubKeyECC = function () {
  return getPublic(this.toPrivKeyECC());
};
BN.prototype.getPubKeyPoint = function () {
  return new Point(new BN(this.getPubKeyEC().getX().toString("hex"), "hex"), new BN(this.getPubKeyEC().getY().toString("hex"), "hex"));
};

class Point {
  constructor(x, y) {
    debugger;
    if (x instanceof BN && y instanceof BN) {
      this.x = x;
      this.y = y;
    } else if (typeof x == "string" && typeof y == "string") {
      this.x = new BN(x, "hex");
      this.y = new BN(y, "hex");
    } else {
      throw TypeError("Point needs to be intialized with BN");
    }
  }
}

module.exports = { Point, BN };
