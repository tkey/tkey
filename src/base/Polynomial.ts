import { ecCurve } from "../utils";
import { BN } from "./BNandPoint";

class Polynomial {
  polynomial: Array<BN>;

  constructor(polynomial: Array<BN>) {
    this.polynomial = polynomial;
  }

  getThreshold() {
    return this.polynomial.length;
  }

  polyEval(x) {
    let tmpX;
    if (typeof x === "string") {
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
    const polynomialCommitments = [];
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

export { Polynomial, PublicPolynomial };
