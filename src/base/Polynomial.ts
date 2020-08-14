import BN from "bn.js";

import { ecCurve } from "../utils";
import { getPubKeyPoint } from "./BNUtils";
import { BNString, PolynomialID } from "./commonTypes";
import Point from "./Point";
import PublicPolynomial from "./PublicPolynomial";
import Share from "./Share";

// @flow
export type ShareMap = {
  [x: string]: Share;
};

class Polynomial {
  polynomial: Array<BN>;

  constructor(polynomial: Array<BN>) {
    this.polynomial = polynomial;
  }

  getThreshold(): number {
    return this.polynomial.length;
  }

  polyEval(x: BNString): BN {
    const tmpX = new BN(x, "hex");
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

  generateShares(shareIndexes: Array<BNString>): ShareMap {
    const newShareIndexes = shareIndexes.map((index) => {
      if (typeof index === "number") {
        return new BN(index);
      }
      if (index instanceof BN) {
        return index;
      }
      if (typeof index === "string") {
        return new BN(index, "hex");
      }
      return index;
    });

    const shares: ShareMap = {};
    for (let x = 0; x < newShareIndexes.length; x += 1) {
      shares[newShareIndexes[x].toString("hex")] = new Share(newShareIndexes[x], this.polyEval(newShareIndexes[x]));
    }
    return shares;
  }

  getPublicPolynomial(): PublicPolynomial {
    const polynomialCommitments: Array<Point> = [];
    for (let i = 0; i < this.polynomial.length; i += 1) {
      polynomialCommitments.push(getPubKeyPoint(this.polynomial[i]));
    }
    return new PublicPolynomial(polynomialCommitments);
  }

  // TODO: inefficient optimize this
  getPolynomialID(): PolynomialID {
    return this.getPublicPolynomial().getPolynomialID();
  }
}

export { Polynomial, PublicPolynomial };
