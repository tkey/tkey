const Torus = require("@toruslabs/torus.js");
// const { decrypt, encrypt, generatePrivate, getPublic } = require("eccrypto");
const { generatePrivate } = require("eccrypto");

const TorusServiceProvider = require("./service-provider");
const TorusStorageLayer = require("./storage-layer");
const { ecCurve } = require("./utils");
const { Point, BN } = require("./types.js");

class ThresholdBak {
  constructor({ enableLogging = false } = {}) {
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.serviceProvider = new TorusServiceProvider();
    this.storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: this.serviceProvider });

    this.shares = {};
  }

  async initialize(input) {
    let shareStore;
    if (input instanceof ShareStore) {
      shareStore = input;
    } else if (!input) {
      // default to use service provider
      // first we see if a share has been kept for us
      let rawServiceProviderShare;
      try {
        rawServiceProviderShare = await this.storageLayer.getMetadata();
      } catch (err) {
        throw new Error(`getMetadata for rawServiceProviderShare in initialize errored: ${err}`);
      }
      shareStore = new ShareStore(rawServiceProviderShare);
    } else {
      throw TypeError("Input is not supported");
    }

    // we fetch metadata for the account from the share
    let latestShareDetails = await this.catchupToLatestShare(shareStore);
    this.metadata = latestShareDetails.shareMetadata;
    debugger;
    this.addShare(latestShareDetails.latestShare);
    // now that we have metadata we set the requirements for reconstruction
    return;
  }

  async catchupToLatestShare(shareStore) {
    let metadata;
    try {
      metadata = await this.storageLayer.getMetadata(shareStore.share.share);
    } catch (err) {
      throw new Error(`getMetadata in initialize errored: ${err}`);
    }
    let shareMetadata = new Metadata(metadata);
    let nextShare;
    try {
      nextShare = new ShareStore(shareMetadata.getEncryptedShare());
    } catch (err) {
      return { latestShare: shareStore, shareMetadata };
    }
    return await catchupToLatestShare(nextShare);
  }

  reconstructKey() {
    if (!this.metadata) {
      throw Error("metadata not found, SDK likely not intialized");
    }
    let pubPoly = this.metadata.getLatestPublicPolynomial();
    let requiredThreshold = pubPoly.getThreshold();
    let pubPolyID = pubPoly.getPolynomialID();

    // check if threshold is met
    let polyShares = Object.keys(this.shares[pubPolyID]);
    let numberOfShares = polyShares.length;
    if (numberOfShares < requiredThreshold) {
      // check if we have any encrypted shares first
      throw Error(`not enough shares for reconstruction, require ${requiredThreshold} but got ${numberOfShares}`);
    }
    let shareArr = [];
    let shareIndexArr = [];
    for (let i = 0; i < requiredThreshold; i++) {
      shareArr.push(this.shares[pubPolyID][polyShares[i]].share.share);
      shareIndexArr.push(this.shares[pubPolyID][polyShares[i]].share.shareIndex);
    }
    let privKey = lagrangeInterpolation(shareArr, shareIndexArr);
    this.setKey(privKey);
    return this.privKey;
  }

  async generateNewShare() {
    if (!this.metadata) {
      throw Error("metadata not found, SDK likely not intialized");
    }
    let pubPoly = this.metadata.getLatestPublicPolynomial();
    let previousPolyID = pubPoly.getPolynomialID();
    let existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);
    // check if existing share indexes exist
    let newShareIndex = new BN(generatePrivate());
    while (existingShareIndexes.includes(newShareIndex.toString("hex"))) {
      newShareIndex = new BN(generatePrivate());
    }
    let results = await this.refreshShares(pubPoly.getThreshold(), [...existingShareIndexes, newShareIndex.toString("hex")], previousPolyID);
    let newShareStores = results.shareStores;

    return { newShareStores, newShareIndex };
  }

  async refreshShares(threshold, newShareIndexes, previousPolyID) {
    const poly = generateRandomPolynomial(threshold - 1, this.privKey);
    const shares = poly.generateShares(newShareIndexes);
    let existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);
    let shareIndexesNeedingEncryption = [];

    let pointsArr = [];
    existingShareIndexes.forEach((shareIndexHex) => {
      pointsArr.push(new Point(new BN(shareIndexHex, "hex"), this.shares[previousPolyID][shareIndexHex].share.share));
      // also add to shares that need encryption/relaying
      if (newShareIndexes.includes(shareIndexHex)) {
        shareIndexesNeedingEncryption.push(shareIndexHex);
      }
    });
    let oldPoly = lagrangeInterpolatePolynomial(pointsArr);

    // add metadata new poly to metadata
    this.metadata.addFromPolynomialAndShares(poly, shares);

    // change to share stores for public storing
    let shareStores = {};
    let polyID = poly.getPolynomialID();
    newShareIndexes.forEach((shareIndexHex) => (shareStores[shareIndexHex] = new ShareStore({ share: shares[shareIndexHex], polynomialID: polyID })));

    // evaluate oldPoly for old shares and set new metadata with encrypted share for new polynomial
    shareIndexesNeedingEncryption.forEach(async (shareIndex) => {
      let m = this.metadata.clone();
      m.setScopedStore = { encryptedShare: shareStores[shareIndex] };
      let oldShare = oldPoly.polyEval(new BN(shareIndex, "hex"));
      try {
        await this.storageLayer.setMetadata(m, oldShare);
      } catch (err) {
        throw err;
      }
    });

    // set share for serviceProvider encrytion
    // 1 is defined as the serviceProvider share
    if (shareIndexesNeedingEncryption.includes("1")) {
      try {
        await this.storageLayer.setMetadata(shareStores["1"]);
      } catch (err) {
        // TODO: handle gracefully
        throw err;
      }
    }

    // set metadata for all new shares
    newShareIndexes.forEach(async (shareIndex) => {
      let m = this.metadata.clone();
      try {
        await this.storageLayer.setMetadata(m, shareStores[shareIndex].share.share);
      } catch (err) {
        throw err;
      }
    });

    return { shareStores };
  }

  async initializeNewKey(userInput) {
    if (userInput) {
      if (!userInput instanceof BN) {
        throw TypeError("user input needs to be of type BN in initializeNewKey");
      }
    }

    const tmpPriv = generatePrivate();
    this.setKey(new BN(tmpPriv));

    // create a random poly and respective shares
    // 1 is defined as the serviceProvider share
    const shareIndexes = [new BN(1), new BN(2)];
    let poly;
    if (userInput) {
      let userShareIndex = new BN(3);
      poly = generateRandomPolynomial(1, this.privKey, [new Share(userShareIndex, userInput)]);
      shareIndexes.push(userShareIndex);
    } else {
      poly = generateRandomPolynomial(1, this.privKey);
    }
    const shares = poly.generateShares(shareIndexes);

    // create metadata to be stored
    const metadata = new Metadata(this.privKey.getPubKeyPoint());
    metadata.addFromPolynomialAndShares(poly, shares);
    let serviceProviderShare = shares[shareIndexes[0].toString("hex")];

    // store torus share on metadata
    let shareStore = new ShareStore({ share: serviceProviderShare, polynomialID: poly.getPolynomialID() });
    try {
      await this.storageLayer.setMetadata(shareStore);
    } catch (err) {
      throw new Error(`setMetadata errored: ${JSON.stringify(err)}`);
    }

    // store metadata on metadata respective to share
    try {
      await this.storageLayer.setMetadata(metadata, serviceProviderShare.share);
    } catch (err) {
      throw new Error(`setMetadata errored: ${err}`);
    }
    let result = {
      privKey: this.privKey,
      deviceShare: new ShareStore({ share: shares[shareIndexes[1].toString("hex")], polynomialID: poly.getPolynomialID() }),
    };
    if (userInput) {
      result.userShare = new ShareStore({ share: shares[shareIndexes[2].toString("hex")], polynomialID: poly.getPolynomialID() });
    }
    return result;
  }

  addShare(shareStore) {
    if (!(shareStore instanceof ShareStore)) {
      throw TypeError("can only add type ShareStore into shares");
    }
    if (!(shareStore.polynomialID in this.shares)) {
      this.shares[shareStore.polynomialID] = {};
    }
    this.shares[shareStore.polynomialID][shareStore.share.shareIndex.toString("hex")] = shareStore;
  }

  setKey(privKey) {
    this.privKey = privKey;
    this.ecKey = ecCurve.keyFromPrivate(this.privKey);
  }
}

// PRIMATIVES (TODO: MOVE TYPES AND THIS INTO DIFFERENT FOLDER)

function lagrangeInterpolatePolynomial(points) {
  let denominator = function (i, innerPoints) {
    let result = new BN(1);
    let xi = innerPoints[i].x;
    for (let j = innerPoints.length - 1; j >= 0; j--) {
      if (i != j) {
        let tmp = new BN(xi);
        tmp = tmp.sub(innerPoints[j].x);
        tmp = tmp.umod(ecCurve.curve.n);
        result = result.mul(tmp);
        result = result.umod(ecCurve.curve.n);
      }
    }
    return result;
  };

  let interpolationPoly = function (i, innerPoints) {
    let coefficients = Array.apply(null, Array(innerPoints.length)).map(function () {
      return new BN(0);
    });
    let d = denominator(i, innerPoints);
    coefficients[0] = d.invm(ecCurve.curve.n);
    for (let k = 0; k < innerPoints.length; k++) {
      let newCoefficients = Array.apply(null, Array(innerPoints.length)).map(function () {
        return new BN(0);
      });
      if (k == i) {
        continue;
      }
      let j;
      if (k < i) {
        j = k + 1;
      } else {
        j = k;
      }
      j = j - 1;
      for (; j >= 0; j--) {
        newCoefficients[j + 1] = newCoefficients[j + 1].add(coefficients[j]);
        newCoefficients[j + 1] = newCoefficients[j + 1].umod(ecCurve.curve.n);
        let tmp = new BN(innerPoints[k].x);
        tmp = tmp.mul(coefficients[j]);
        tmp = tmp.umod(ecCurve.curve.n);
        newCoefficients[j] = newCoefficients[j].sub(tmp);
        newCoefficients[j] = newCoefficients[j].umod(ecCurve.curve.n);
      }
      coefficients = newCoefficients;
    }
    return coefficients;
  };

  let pointSort = function (innerPoints) {
    sortedPoints = [...innerPoints];
    sortedPoints.sort(function (a, b) {
      return a.x.cmp(b.x);
    });
    return sortedPoints;
  };

  let lagrange = function (unsortedPoints) {
    let sortedPoints = pointSort(unsortedPoints);
    polynomial = Array.apply(null, Array(sortedPoints.length)).map(function () {
      return new BN(0);
    });
    for (let i = 0; i < sortedPoints.length; i++) {
      let coefficients = interpolationPoly(i, sortedPoints);
      for (let k = 0; k < sortedPoints.length; k++) {
        let tmp = new BN(sortedPoints[i].y);
        tmp = tmp.mul(coefficients[k]);
        polynomial[k] = polynomial[k].add(tmp);
        polynomial[k] = polynomial[k].umod(ecCurve.curve.n);
      }
    }
    return new Polynomial(polynomial);
  };

  return lagrange(points);
}

function lagrangeInterpolation(shares, nodeIndex) {
  if (shares.length !== nodeIndex.length) {
    throw Error("shares not equal to nodeIndex length in lagrangeInterpolation");
  }
  let secret = new BN(0);
  for (let i = 0; i < shares.length; i += 1) {
    let upper = new BN(1);
    let lower = new BN(1);
    for (let j = 0; j < shares.length; j += 1) {
      if (i !== j) {
        upper = upper.mul(nodeIndex[j].neg());
        upper = upper.umod(ecCurve.curve.n);
        let temp = nodeIndex[i].sub(nodeIndex[j]);
        temp = temp.umod(ecCurve.curve.n);
        lower = lower.mul(temp).umod(ecCurve.curve.n);
      }
    }
    let delta = upper.mul(lower.invm(ecCurve.curve.n)).umod(ecCurve.curve.n);
    delta = delta.mul(shares[i]).umod(ecCurve.curve.n);
    secret = secret.add(delta);
  }
  return secret.umod(ecCurve.curve.n);
}

// generateRandomPolynomial - determinsiticShares are assumed random
function generateRandomPolynomial(degree, secret, determinsticShares) {
  let actualS = secret;
  if (!secret) {
    actualS = new BN(generatePrivate());
  }
  if (!determinsticShares) {
    const poly = [actualS];
    for (let i = 0; i < degree; i += 1) {
      poly.push(new BN(generatePrivate()));
    }
    return new Polynomial(poly);
  } else {
    if (!Array.isArray(determinsticShares)) {
      throw TypeError("determinisitc shares in generateRandomPolynomial should be an array");
    }

    if (determinsticShares.length > degree) {
      throw TypeError("determinsticShares in generateRandomPolynomial need to be less than degree to ensure an element of randomness");
    }
    let points = {};
    determinsticShares.forEach((share) => {
      points[share.shareIndex.toString("hex")] = new Point(share.shareIndex, share.share);
    });
    for (let i = 0; i < degree - determinsticShares.length; i++) {
      let shareIndex = new BN(generatePrivate());
      while (Object.keys(points).includes(shareIndex.toString("hex"))) {
        shareIndex = new BN(generatePrivate());
      }
      points[shareIndex.toString("hex")] = new Point(shareIndex, new BN(generatePrivate));
    }
    points["0"] = new Point(new BN(0), actualS);
    let pointsArr = [];
    Object.keys(points).forEach((shareIndex) => pointsArr.push(points[shareIndex]));
    return (poly = lagrangeInterpolatePolynomial(pointsArr));
  }
}

class Metadata {
  constructor(input) {
    if (input instanceof Point) {
      this.pubKey = input;
      this.publicPolynomials = {};
      this.publicShares = {};
      this.polyIDList = [];
    } else if (typeof input == "object") {
      // assumed to be JSON.parsed object
      this.pubKey = new Point(input.pubKey.x, input.pubKey.y);
      this.publicPolynomials = {};
      this.publicShares = {};
      this.polyIDList = input.polyIDList;
      if (input.scopedStore) this.scopedStore = input.scopedStore;
      // for publicPolynomials
      for (let pubPolyID in input.publicPolynomials) {
        let pointCommitments = [];
        input.publicPolynomials[pubPolyID].polynomialCommitments.forEach((commitment) => {
          pointCommitments.push(new Point(commitment.x, commitment.y));
        });
        let publicPolynomial = new PublicPolynomial(pointCommitments);
        this.publicPolynomials[pubPolyID] = publicPolynomial;
      }
      // for publicShares
      for (let pubPolyID in input.publicShares) {
        for (let shareIndex in input.publicShares[pubPolyID]) {
          let newPubShare = new PublicShare(
            input.publicShares[pubPolyID][shareIndex].shareIndex,
            new Point(input.publicShares[pubPolyID][shareIndex].shareCommitment.x, input.publicShares[pubPolyID][shareIndex].shareCommitment.y)
          );
          this.addPublicShare(pubPolyID, newPubShare);
        }
      }
    } else {
      throw TypeError("not a valid constructor argument for Metadata");
    }
  }

  getShareIndexesForPolynomial(polyID) {
    return Object.keys(this.publicShares[polyID]);
  }

  getLatestPublicPolynomial() {
    return this.publicPolynomials[this.polyIDList[this.polyIDList.length - 1]];
  }

  addPublicPolynomial(publicPolynomial) {
    let polyID = publicPolynomial.getPolynomialID();
    this.publicPolynomials[polyID] = publicPolynomial;
    this.polyIDList.push(polyID);
  }

  addPublicShare(polynomialID, publicShare) {
    if (!(polynomialID in this.publicShares)) {
      this.publicShares[polynomialID] = {};
    }
    this.publicShares[polynomialID][publicShare.shareIndex.toString("hex")] = publicShare;
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

  setScopedStore(scopedStore) {
    this.scopedStore = scopedStore;
  }

  getEncryptedShare() {
    return this.scopedStore.encryptedShare;
  }

  clone() {
    return new Metadata(JSON.parse(JSON.stringify(this)));
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
  Share,
  generateRandomPolynomial,
  lagrangeInterpolation,
  lagrangeInterpolatePolynomial,
};
