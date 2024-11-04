import { secp256k1 } from "@noble/curves/secp256k1";

import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import { bigIntToHex, bigIntUmod } from "../utils";
import Point, { curveType } from "./Point";
import PublicPolynomial from "./PublicPolynomial";
import Share from "./Share";
// @flow
export type ShareMap = {
  [x: string]: Share;
};

class Polynomial implements ISerializable {
  polynomial: bigint[];

  publicPolynomial: PublicPolynomial;

  constructor(polynomial: bigint[]) {
    this.polynomial = polynomial;
  }

  static fromJSON(value: StringifiedType): Polynomial {
    const { polynomial } = value;
    return new Polynomial(polynomial.map((x: string) => Point.fromSEC1(curveType.secp256k1, x)));
  }

  getThreshold(): number {
    return this.polynomial.length;
  }

  polyEval(x: bigint): bigint {
    const tmpX = x;
    let xi = x;
    let sum = BigInt(0);

    sum = sum + this.polynomial[0];
    for (let i = 1; i < this.polynomial.length; i += 1) {
      const tmp = xi * this.polynomial[i];
      sum = sum + tmp;
      sum = bigIntUmod(sum, secp256k1.CURVE.n);
      xi = xi * tmpX;
      xi = bigIntUmod(xi, secp256k1.CURVE.n);
    }
    return sum;
  }

  generateShares(shareIndexes: bigint[]): ShareMap {
    const newShareIndexes = shareIndexes;

    const shares: ShareMap = {};
    for (let x = 0; x < newShareIndexes.length; x += 1) {
      shares[newShareIndexes[x].toString(16)] = new Share(newShareIndexes[x], this.polyEval(newShareIndexes[x]));
    }
    return shares;
  }

  getPublicPolynomial(): PublicPolynomial {
    const polynomialCommitments: Point[] = [];
    for (let i = 0; i < this.polynomial.length; i += 1) {
      polynomialCommitments.push(Point.fromScalar(curveType.secp256k1, bigIntToHex(this.polynomial[i])));
    }
    this.publicPolynomial = new PublicPolynomial(polynomialCommitments);
    return this.publicPolynomial;
  }

  getPolynomialID(): PolynomialID {
    return this.publicPolynomial.polynomialId;
  }

  toJSON(): StringifiedType {
    return {
      polynomial: this.polynomial.map((x) => x.toString(16)),
    };
  }
}

export default Polynomial;
