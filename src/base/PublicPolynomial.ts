import { Point } from "./BNandPoint";
import { PolynomialID } from "./commonTypes";

class PublicPolynomial {
  polynomialCommitments: Array<Point>;

  constructor(polynomialCommitments: Array<Point>) {
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
}

export default PublicPolynomial;
