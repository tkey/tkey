const Torus = require("@toruslabs/torus.js");
// const { decrypt, encrypt, generatePrivate, getPublic } = require("eccrypto");
const { generatePrivate } = require("eccrypto");

const TorusServiceProvider = require("./service-provider");
const TorusStorageLayer = require("./storage-layer");
const { ecCurve } = require("./utils");
const { Point, BN } = require("./types.js");

class ThresholdBak {
  constructor({ enableLogging = false, postboxKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d" } = {}) {
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.postboxKey = new BN(postboxKey, "hex");
    this.serviceProvider = new TorusServiceProvider({ postboxKey: postboxKey });
    this.storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: this.serviceProvider });
  }

  async retrieveMetadata() {
    let keyDetails;
    try {
      keyDetails = await this.storageLayer.getMetadata();
    } catch (err) {
      throw new Error(`getMetadata errored: ${err}`);
    }
    let response;
    try {
      response = await this.serviceProvider.decrypt(keyDetails);
    } catch (err) {
      throw new Error(`decrypt errored: ${err}`);
    }
    return response;
  }

  async initializeNewKey() {
    const tmpPriv = generatePrivate();
    this.setKey(new BN(tmpPriv));

    // create a random poly and respective shares
    const shareIndexes = [new BN(1), new BN(2)];
    for (let i = 1; i <= 2; i++) {
      let ran = generatePrivate();
      while (ran < 2) {
        ran = generatePrivate();
      }
      shareIndexes.push(new BN(ran));
    }
    const poly = generateRandomPolynomial(1, this.privKey);
    const shares = poly.generateShares(shareIndexes);

    // create metadata to be stored
    const metadata = new Metadata(this.privKey.getPubKeyPoint());
    metadata.addFromPolynomialAndShares(poly, shares);

    // store torus share on metadata
    const bufferMetadata = Buffer.from(JSON.stringify(metadata));
    const encryptedDetails = await this.serviceProvider.encrypt(this.postboxKey.getPubKeyECC(), bufferMetadata);
    try {
      await this.storageLayer.setMetadata(encryptedDetails);
    } catch (err) {
      throw new Error(`setMetadata errored: ${err}`);
    }
    return { privKey: this.privKey };
  }

  setKey(privKey) {
    this.privKey = privKey;
    this.ecKey = ecCurve.keyFromPrivate(this.privKey);
  }
}

// PRIMATIVES (TODO: MOVE TYPES AND THIS INTO DIFFERENT FOLDER)

// function lagrangeInterpolation(shares, nodeIndex) {
//   if (shares.length !== nodeIndex.length) {
//     return null;
//   }
//   let secret = new BN(0);
//   for (let i = 0; i < shares.length; i += 1) {
//     let upper = new BN(1);
//     let lower = new BN(1);
//     for (let j = 0; j < shares.length; j += 1) {
//       if (i !== j) {
//         upper = upper.mul(nodeIndex[j].neg());
//         upper = upper.umod(ecCurve.curve.n);
//         let temp = nodeIndex[i].sub(nodeIndex[j]);
//         temp = temp.umod(ecCurve.curve.n);
//         lower = lower.mul(temp).umod(ecCurve.curve.n);
//       }
//     }
//     let delta = upper.mul(lower.invm(ecCurve.curve.n)).umod(ecCurve.curve.n);
//     delta = delta.mul(shares[i]).umod(ecCurve.curve.n);
//     secret = secret.add(delta);
//   }
//   return secret.umod(ecCurve.curve.n);
// }

// function generateRandomShares(degree, numOfShares, secret) {
//   const poly = this.generateRandomPolynomial(degree, secret);
//   const shares = [];
//   for (let x = 1; x <= numOfShares; x += 1) {
//     shares.push({ index: x, share: this.polyEval(poly, x) });
//   }
//   return { shares, poly };
// }

// function generateShares(shareIndexes, poly) {
//   const shares = {};
//   for (let x = 0; x <= shareIndexes.length; x += 1) {
//     shares[shareIndexes[x].toString("hex")] = new Share(shareIndexes[x], poly.polyEval(shareIndexes[x]));
//   }
//   return { shares, poly };
// }

function generateRandomPolynomial(degree, secret) {
  let actualS = secret;
  if (!secret) {
    actualS = new BN(generatePrivate());
  }
  const poly = [actualS];
  for (let i = 0; i < degree; i += 1) {
    poly.push(new BN(generatePrivate()));
  }
  return new Polynomial(poly);
}

// function polyEval(polynomial, x) {
//   let xi = new BN(x);
//   let sum = new BN(0);
//   for (let i = 1; i < polynomial.length; i += 1) {
//     const tmp = xi.mul(polynomial[i]);
//     sum = sum.add(tmp);
//     sum = sum.umod(ecCurve.curve.n);
//     xi = xi.mul(new BN(x));
//     xi = xi.umod(ecCurve.curve.n);
//   }
//   return sum;
// }

/*
Metadata
{
  pubKey
  publicPolynomials[polyID]PublicPolynomial
  publicShares[polyID]PublicShares
}

Share
{
  share
  shareIndex

PublicPolynomial
{
  threshold
  publicShareDetails
  idCommitments (of 1...n = t)
}

PublicShareDetails 
{
  shareIndex
  shareCommitment
}

IdCommitments 
{
  shareIndex
  shareCommitment 
}

PolyID
hash(threshold | commitment of 1 | 2 | ... | n = t)
*/

class Metadata {
  constructor(input) {
    if (input instanceof Point) {
      this.pubKey = input;
      this.publicPolynomials = {};
      this.publicShares = {};
    } else if (typeof input == "object") {
      // assumed to be JSON.parsed object
      this.pubKey = new Point(input.pubKey.x, input.pubKey.y);
      // for publicPolynomials
      this.publicPolynomials = {};

      for (let pubPolyID in input.publicPolynomials) {
        let pointCommitments = [];
        input.publicPolynomials[pubPolyID].polynomialCommitments.forEach((commitment) => {
          pointCommitments.push(new Point(commitment.x, commitment.y));
        });
        let publicPolynomial = new PublicPolynomial(pointCommitments);
        this.addPublicPolynomial(publicPolynomial);
      }
      // for publicShares
      this.publicShares = {};
      for (let pubPolyID in input.publicShares) {
        let newPubShare = new PublicShare(
          input.publicShares[pubPolyID].shareIndex,
          new Point(input.publicShares[pubPolyID].shareCommitment.x, input.publicShares[pubPolyID].shareCommitment.y)
        );
        this.addPublicShare(pubPolyID, newPubShare);
      }
    } else {
      throw TypeError("not a valid constructor argument for Metadata");
    }
  }

  addPublicPolynomial(publicPolynomial) {
    this.publicPolynomials[publicPolynomial.getPolynomialID()] = publicPolynomial;
  }

  addPublicShare(polynomialID, publicShare) {
    this.publicShares[polynomialID] = publicShare;
  }

  addFromPolynomialAndShares(polynomial, shares) {
    let publicPolynomial = polynomial.getPublicPolynomial();
    this.addPublicPolynomial(publicPolynomial);
    if (Array.isArray(shares)) {
      for (let i = 0; i < shares.length; i++) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[i].getPublicShare());
      }
    } else {
      for (let k in shares) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[k].getPublicShare());
      }
    }
  }

  // toJSON() {}
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

class PublicPolynomial {
  constructor(polynomialCommitments) {
    this.polynomialCommitments = polynomialCommitments;
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
    let xi = new BN(x);
    let sum = new BN(0);
    sum = sum.add(this.polynomial[0]);
    for (let i = 1; i < this.polynomial.length; i += 1) {
      const tmp = xi.mul(this.polynomial[i]);
      sum = sum.add(tmp);
      sum = sum.umod(ecCurve.curve.n);
      xi = xi.mul(new BN(x));
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
}

class PublicShare {
  constructor(shareIndex, shareCommitment) {
    if (shareCommitment instanceof Point) {
      this.shareCommitment = shareCommitment;
    } else {
      throw new TypeError("expected shareCommitment to be Point");
    }

    if (typeof shareIndex === "string") {
      this.shareIndex = new BN(shareIndex, "hex");
    } else if (shareIndex instanceof BN) {
      this.shareIndex = shareIndex;
    } else {
      throw new TypeError("expected shareIndex to be either BN or hex string");
    }
  }
}

// DEPRECATED BECAUSE WE CAN'T EXTEND BN
// class Scalar extends BN {
//   constructor(...args) {
//     super(...args);
//     // Done because https://stackoverflow.com/questions/47429157/instanceof-not-working-properly
//     Object.setPrototypeOf(this, Scalar.prototype);
//   }
//   toPrivKeyEcc() {
//     return this.toBuffer("be", 32);
//   }

//   getPubKeyECC() {
//     return getPublic(this.toPrivKeyEcc());
//   }

//   getPubKeyPoint() {
//     return new Point(this.toPubKeyECC().getX(), this.toPubKeyECC().getY());
//   }
// }

module.exports = {
  ThresholdBak,
  Polynomial,
  Metadata,
  generateRandomPolynomial,
};
