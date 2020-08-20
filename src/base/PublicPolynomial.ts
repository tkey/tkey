import { ISerializable, PolynomialID, StringifiedType } from "../baseTypes/commonTypes";
import Point from "./Point";

class PublicPolynomial implements ISerializable {
  polynomialCommitments: Point[];

  constructor(polynomialCommitments: Point[]) {
    this.polynomialCommitments = polynomialCommitments;
  }

  getThreshold(): number {
    return this.polynomialCommitments.length;
  }

  getPolynomialID(): PolynomialID {
    let idSeed = "";
    for (let i = 0; i < this.polynomialCommitments.length; i += 1) {
      let nextChunk = this.polynomialCommitments[i].x.toString("hex");
      if (i !== 0) {
        nextChunk = `|${nextChunk}`;
      }
      idSeed += nextChunk;
    }
    return idSeed;
  }

  toJSON(): StringifiedType {
    return {
      polynomialCommitments: this.polynomialCommitments,
    };
  }

  static fromJSON(value: StringifiedType): PublicPolynomial {
    const points: Point[] = value.polynomialCommitments.map((x: StringifiedType) => Point.fromJSON(x));
    return new PublicPolynomial(points);
  }
}

// @flow
export type PublicPolynomialMap = {
  [polynomialID: string]: PublicPolynomial;
};

export default PublicPolynomial;
