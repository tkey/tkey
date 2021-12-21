import BN from "bn.js";

import { BNString, ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import { ecCurve } from "../utils";
import { getPubKeyPoint } from "./BNUtils";
import Point from "./Point";
import PublicPolynomial from "./PublicPolynomial";
import Share from "./Share";

// @flow
export type ShareMap = {
  [x: string]: Share;
};

class Polynomial implements ISerializable {
  polynomial: BN[];

  publicPolynomial: PublicPolynomial;

  constructor(polynomial: BN[]) {
    this.polynomial = polynomial;
  }

  static fromJSON(value: StringifiedType): Polynomial {
    const { polynomial } = value;
    return new Polynomial(polynomial.map((x: string) => new BN(x, "hex")));
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

  generateShares(shareIndexes: BNString[]): ShareMap {
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
    const polynomialCommitments: Point[] = [];
    for (let i = 0; i < this.polynomial.length; i += 1) {
      polynomialCommitments.push(getPubKeyPoint(this.polynomial[i]));
    }
    this.publicPolynomial = new PublicPolynomial(polynomialCommitments);
    return this.publicPolynomial;
  }

  getPolynomialID(): PolynomialID {
    return this.publicPolynomial.polynomialId;
  }

  toJSON(): StringifiedType {
    return {
      polynomial: this.polynomial.map((x) => x.toString("hex")),
    };
  }
}

export default Polynomial;
