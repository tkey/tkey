const BN = require("bn.js");
const { Point } = require("./types.js");
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
  return new Point(this.getPubKeyEC().getX(), this.getPubKeyEC().getY());
};

module.exports = BN;
