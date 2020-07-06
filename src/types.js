const BN = require("bn.js");
const { ecCurve } = require("./utils");
const { getPublic } = require("eccrypto");

// This is done because we can't extend BN
BN.prototype.toPrivKeyEC = function () {
  return ecCurve.keyFromPrivate(this.toString("hex", 64));
};

BN.prototype.toPrivKeyECC = function () {
  const tmp = new BN("be", "hex");
  return Buffer.from(tmp.toString("hex", 64), "hex");
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
  // complies with EC point pub key  encoding api
  encode(enc) {
    if (enc === "arr") {
      return Buffer.concat[(0x04, this.x.toBuffer("be", 32), this.y.toBuffer("be", 32))];
    }
    throw Error("encoding doesnt exist in Point");
  }
}

class Share {
  constructor(shareIndex, share) {
    if (typeof share === "string") {
      this.share = new BN(share, "hex");
    } else if (share instanceof BN) {
      this.share = share;
    } else {
      throw new TypeError(`expected share to be either BN or hex string instead got :${share}`);
    }

    if (typeof shareIndex === "string") {
      this.shareIndex = new BN(shareIndex, "hex");
    } else if (shareIndex instanceof BN) {
      this.shareIndex = shareIndex;
    } else {
      throw new TypeError("expected shareIndex to be either BN or hex string");
    }
  }

  getPublicShare() {
    return new PublicShare(this.shareIndex, this.share.getPubKeyPoint());
  }
}

class ShareStore {
  constructor({ share, polynomialID }) {
    if (share instanceof Share && typeof polynomialID === "string") {
      this.share = share;
      this.polynomialID = polynomialID;
    } else if (typeof share === "object" && typeof polynomialID === "string") {
      if (!"share" in share || !"shareIndex" in share) {
        throw new TypeError("expected ShareStore input share to have share and shareIndex");
      }
      this.share = new Share(share.shareIndex, share.share);
      this.polynomialID = polynomialID;
    } else {
      throw new TypeError("expected ShareStore inputs to be Share and string");
    }
  }
}

class PublicPolynomial {
  constructor(polynomialCommitments) {
    this.polynomialCommitments = polynomialCommitments;
  }
  getThreshold() {
    return this.polynomialCommitments.length;
  }
  getPolynomialID() {
    let idSeed = "";
    for (let i = 0; i < this.polynomialCommitments.length; i++) {
      let nextChunk = this.polynomialCommitments[i].x.toString("hex");
      if (i != 0) {
        nextChunk = `|${nextChunk}`;
      }
      idSeed = idSeed + nextChunk;
    }
    return idSeed;
  }
}

class Polynomial {
  constructor(polynomial) {
    this.polynomial = polynomial;
  }

  getThreshold() {
    return this.polynomial.length;
  }

  polyEval(x) {
    let tmpX;
    if (typeof x == "string") {
      tmpX = new BN(x, "hex");
    } else {
      tmpX = new BN(x);
    }
    let xi = new BN(tmpX);
    let sum = new BN(0);
    sum = sum.add(this.polynomial[0]);
    for (let i = 1; i < this.polynomial.length; i += 1) {
      const tmp = xi.mul(this.polynomial[i]);
      sum = sum.add(tmp);
      sum = sum.umod(ecCurve.curve.n);
      xi = xi.mul(new BN(tmpX));
      xi = xi.umod(ecCurve.curve.n);
    }
    return sum;
  }

  generateShares(shareIndexes) {
    const shares = {};
    for (let x = 0; x < shareIndexes.length; x += 1) {
      shares[shareIndexes[x].toString("hex")] = new Share(shareIndexes[x], this.polyEval(shareIndexes[x]));
    }
    return shares;
  }

  getPublicPolynomial() {
    let polynomialCommitments = [];
    for (let i = 0; i < this.polynomial.length; i++) {
      polynomialCommitments.push(this.polynomial[i].getPubKeyPoint());
    }
    return new PublicPolynomial(polynomialCommitments);
  }

  // TODO: inefficinet optimize this
  getPolynomialID() {
    return this.getPublicPolynomial().getPolynomialID();
  }
}

class PublicShare {
  constructor(shareIndex, shareCommitment) {
    if (shareCommitment instanceof Point) {
      this.shareCommitment = shareCommitment;
    } else {
      throw new TypeError("expected shareCommitment to be Point");
    }

    if (typeof shareIndex === "string") {
      // shaves off extrapadding when serializing BN so when we deserialize we get a deepEqual
      let tmpShareIndex = shareIndex;
      if (tmpShareIndex.length == 2) {
        if (tmpShareIndex[0] == "0") {
          tmpShareIndex = tmpShareIndex[1];
        }
      }
      this.shareIndex = new BN(tmpShareIndex, "hex");
    } else if (shareIndex instanceof BN) {
      this.shareIndex = shareIndex;
    } else {
      throw new TypeError("expected shareIndex to be either BN or hex string");
    }
  }
}

module.exports = { Point, BN, Share, ShareStore, PublicShare, Polynomial, PublicPolynomial };
