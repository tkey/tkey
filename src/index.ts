// const { decrypt, encrypt, generatePrivate, getPublic } = require("eccrypto");
import { generatePrivate } from "eccrypto";

import TorusServiceProvider from "./service-provider";
import TorusStorageLayer from "./storage-layer";
import { BN, Point, Polynomial, PublicPolynomial, PublicShare, Share, ShareStore } from "./types.js";
import { ecCurve, isEmptyObject } from "./utils";

class ThresholdBak {
  constructor({ enableLogging = false, modules = {}, serviceProvider = undefined, storageLayer = undefined, directParams = {} } = {}) {
    this.enableLogging = enableLogging;

    // Defaults to torus SP and SL
    if (!serviceProvider) {
      this.serviceProvider = new TorusServiceProvider({ directParams });
    } else {
      this.serviceProvider = serviceProvider;
    }

    if (!storageLayer) {
      this.storageLayer = new TorusStorageLayer({ serviceProvider: this.serviceProvider });
    } else {
      this.storageLayer = storageLayer;
    }

    this.modules = modules;
    this.shares = {};
  }

  async initialize(input) {
    // initialize modules
    for (const moduleName in this.modules) {
      this.modules[moduleName].initialize(this);
    }

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
      if (isEmptyObject(rawServiceProviderShare)) {
        // no metadata set, assumes new user
        await this.initializeNewKey();
        return this.getKeyDetails();
      }
      // else we continue with catching up share and metadata
      shareStore = new ShareStore(rawServiceProviderShare);
    } else {
      throw TypeError("Input is not supported");
    }

    // we fetch metadata for the account from the share
    const latestShareDetails = await this.catchupToLatestShare(shareStore);
    this.metadata = latestShareDetails.shareMetadata;
    this.inputShare(latestShareDetails.latestShare);
    // now that we have metadata we set the requirements for reconstruction
    return this.getKeyDetails();
  }

  async catchupToLatestShare(shareStore) {
    let metadata;
    try {
      metadata = await this.storageLayer.getMetadata(shareStore.share.share);
    } catch (err) {
      throw new Error(`getMetadata in initialize errored: ${err}`);
    }
    const shareMetadata = new Metadata(metadata);
    let nextShare;
    try {
      nextShare = new ShareStore(shareMetadata.getEncryptedShare());
    } catch (err) {
      return { latestShare: shareStore, shareMetadata };
    }
    return await this.catchupToLatestShare(nextShare);
  }

  reconstructKey() {
    if (!this.metadata) {
      throw Error("metadata not found, SDK likely not intialized");
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const requiredThreshold = pubPoly.getThreshold();
    const pubPolyID = pubPoly.getPolynomialID();

    // check if threshold is met
    const polyShares = Object.keys(this.shares[pubPolyID]);
    const numberOfShares = polyShares.length;
    if (numberOfShares < requiredThreshold) {
      // check if we have any encrypted shares first
      throw Error(`not enough shares for reconstruction, require ${requiredThreshold} but got ${numberOfShares}`);
    }
    const shareArr = [];
    const shareIndexArr = [];
    for (let i = 0; i < requiredThreshold; i++) {
      shareArr.push(this.shares[pubPolyID][polyShares[i]].share.share);
      shareIndexArr.push(this.shares[pubPolyID][polyShares[i]].share.shareIndex);
    }
    const privKey = lagrangeInterpolation(shareArr, shareIndexArr);
    this.setKey(privKey);
    return this.privKey;
  }

  async generateNewShare() {
    if (!this.metadata) {
      throw Error("metadata not found, SDK likely not intialized");
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const previousPolyID = pubPoly.getPolynomialID();
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);
    // check if existing share indexes exist
    let newShareIndex = new BN(generatePrivate());
    while (existingShareIndexes.includes(newShareIndex.toString("hex"))) {
      newShareIndex = new BN(generatePrivate());
    }
    const results = await this.refreshShares(pubPoly.getThreshold(), [...existingShareIndexes, newShareIndex.toString("hex")], previousPolyID);
    const newShareStores = results.shareStores;

    return { newShareStores, newShareIndex };
  }

  async refreshShares(threshold, newShareIndexes, previousPolyID) {
    const poly = generateRandomPolynomial(threshold - 1, this.privKey);
    const shares = poly.generateShares(newShareIndexes);
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[previousPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i++) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[previousPolyID][sharesForExistingPoly[i]].share.share));
    }
    const oldPoly = lagrangeInterpolatePolynomial(pointsArr);

    const shareIndexesNeedingEncryption = [];
    for (let index = 0; index < existingShareIndexes.length; index++) {
      const shareIndexHex = existingShareIndexes[index];
      // define shares that need encryption/relaying
      if (newShareIndexes.includes(shareIndexHex)) {
        shareIndexesNeedingEncryption.push(shareIndexHex);
      }
    }

    // add metadata new poly to metadata
    this.metadata.addFromPolynomialAndShares(poly, shares);

    // change to share stores for public storing
    const shareStores = {};
    const polyID = poly.getPolynomialID();
    newShareIndexes.forEach((shareIndexHex) => (shareStores[shareIndexHex] = new ShareStore({ share: shares[shareIndexHex], polynomialID: polyID })));

    // evaluate oldPoly for old shares and set new metadata with encrypted share for new polynomial
    for (let index = 0; index < shareIndexesNeedingEncryption.length; index++) {
      const shareIndex = shareIndexesNeedingEncryption[index];
      const m = this.metadata.clone();
      m.setScopedStore({ encryptedShare: shareStores[shareIndex] });
      const oldShare = oldPoly.polyEval(new BN(shareIndex, "hex"));
      try {
        await this.storageLayer.setMetadata(m, oldShare);
      } catch (err) {
        throw err;
      }
    }

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
    for (let index = 0; index < newShareIndexes.length; index++) {
      const shareIndex = newShareIndexes[index];
      const m = this.metadata.clone();
      try {
        await this.storageLayer.setMetadata(m, shareStores[shareIndex].share.share);
      } catch (err) {
        throw err;
      }
      this.inputShare(shareStores[shareIndex]);
    }

    return { shareStores };
  }

  async syncShareMetadata(adjustScopedStore) {
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const pubPolyID = pubPoly.getPolynomialID();
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(pubPolyID);
    const threshold = pubPoly.getThreshold();

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[pubPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i++) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[pubPolyID][sharesForExistingPoly[i]].share.share));
    }
    const currentPoly = lagrangeInterpolatePolynomial(pointsArr);
    const allExistingShares = currentPoly.generateShares(existingShareIndexes);

    for (let index = 0; index < existingShareIndexes.length; index++) {
      const shareIndex = existingShareIndexes[index];
      const newMetadata = this.metadata.clone();
      let resp;
      try {
        resp = await this.storageLayer.getMetadata(allExistingShares[shareIndex].share);
      } catch (err) {
        throw new Error(`getMetadata in syncShareMetadata errored: ${err}`);
      }
      const specificShareMetadata = new Metadata(resp);

      let scopedStoreToBeSet;
      if (adjustScopedStore) {
        scopedStoreToBeSet = adjustScopedStore(specificShareMetadata.scopedStore);
      } else {
        scopedStoreToBeSet = specificShareMetadata.scopedStore;
      }
      newMetadata.setScopedStore(scopedStoreToBeSet);
      try {
        await this.storageLayer.setMetadata(newMetadata, allExistingShares[shareIndex].share);
      } catch (err) {
        throw err;
      }
    }
  }

  async initializeNewKey(userInput) {
    if (userInput) {
      if (!userInput instanceof BN) {
        throw TypeError("user input needs to be of type BN in initializeNewKey");
      }
    }

    // initialize modules
    for (const moduleName in this.modules) {
      this.modules[moduleName].initialize(this);
    }

    const tmpPriv = generatePrivate();
    this.setKey(new BN(tmpPriv));

    // create a random poly and respective shares
    // 1 is defined as the serviceProvider share
    const shareIndexes = [new BN(1), new BN(2)];
    let poly;
    if (userInput) {
      const userShareIndex = new BN(3);
      poly = generateRandomPolynomial(1, this.privKey, [new Share(userShareIndex, userInput)]);
      shareIndexes.push(userShareIndex);
    } else {
      poly = generateRandomPolynomial(1, this.privKey);
    }
    const shares = poly.generateShares(shareIndexes);

    // create metadata to be stored
    const metadata = new Metadata(this.privKey.getPubKeyPoint());
    metadata.addFromPolynomialAndShares(poly, shares);
    const serviceProviderShare = shares[shareIndexes[0].toString("hex")];

    // store torus share on metadata
    const shareStore = new ShareStore({ share: serviceProviderShare, polynomialID: poly.getPolynomialID() });
    try {
      await this.storageLayer.setMetadata(shareStore);
    } catch (err) {
      throw new Error(`setMetadata errored: ${JSON.stringify(err)}`);
    }

    // store metadata on metadata respective to shares
    for (let index = 0; index < shareIndexes.length; index++) {
      const shareIndex = shareIndexes[index];
      try {
        await this.storageLayer.setMetadata(metadata, shares[shareIndex.toString("hex")].share);
      } catch (err) {
        throw err;
      }
      // also add into our share store
      this.inputShare(new ShareStore({ share: shares[shareIndex.toString("hex")], polynomialID: poly.getPolynomialID() }));
    }

    this.metadata = metadata;
    const result = {
      privKey: this.privKey,
      deviceShare: new ShareStore({ share: shares[shareIndexes[1].toString("hex")], polynomialID: poly.getPolynomialID() }),
    };
    if (userInput) {
      result.userShare = new ShareStore({ share: shares[shareIndexes[2].toString("hex")], polynomialID: poly.getPolynomialID() });
    }

    return result;
  }

  inputShare(shareStore) {
    let ss;
    if (shareStore instanceof ShareStore) {
      ss = shareStore;
    } else if (typeof shareStore === "object") {
      ss = new ShareStore(shareStore);
    } else {
      throw TypeError("can only add type ShareStore into shares");
    }
    if (!(ss.polynomialID in this.shares)) {
      this.shares[ss.polynomialID] = {};
    }
    this.shares[ss.polynomialID][ss.share.shareIndex.toString("hex")] = ss;
  }

  outputShare(shareIndex) {
    let shareIndexParsed;
    if (typeof shareIndex === "number") {
      shareIndexParsed = new BN(shareIndex);
    } else if (shareIndex instanceof BN) {
      shareIndexParsed = shareIndex;
    } else if (typeof shareIndex === "string") {
      shareIndexParsed = new BN(shareIndex, "hex");
    }
    return this.shares[this.metadata.getLatestPublicPolynomial().getPolynomialID()][shareIndexParsed.toString("hex")];
  }

  setKey(privKey) {
    this.privKey = privKey;
    this.ecKey = ecCurve.keyFromPrivate(this.privKey);
  }

  getKeyDetails() {
    const poly = this.metadata.getLatestPublicPolynomial();
    const requiredShares = poly.getThreshold() - Object.keys(this.shares[poly.getPolynomialID()]).length;
    return {
      pubKey: this.metadata.pubKey,
      requiredShares,
      threshold: poly.getThreshold(),
      totalShares: Object.keys(this.metadata.publicShares[poly.getPolynomialID()]).length,
      modules: this.modules,
    };
  }
}

// PRIMATIVES (TODO: MOVE TYPES AND THIS INTO DIFFERENT FOLDER)

function lagrangeInterpolatePolynomial(points) {
  const denominator = function (i, innerPoints) {
    let result = new BN(1);
    const xi = innerPoints[i].x;
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

  const interpolationPoly = function (i, innerPoints) {
    let coefficients = Array.apply(null, Array(innerPoints.length)).map(function () {
      return new BN(0);
    });
    const d = denominator(i, innerPoints);
    coefficients[0] = d.invm(ecCurve.curve.n);
    for (let k = 0; k < innerPoints.length; k++) {
      const newCoefficients = Array.apply(null, Array(innerPoints.length)).map(function () {
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
      j -= 1;
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

  const pointSort = function (innerPoints) {
    sortedPoints = [...innerPoints];
    sortedPoints.sort(function (a, b) {
      return a.x.cmp(b.x);
    });
    return sortedPoints;
  };

  const lagrange = function (unsortedPoints) {
    const sortedPoints = pointSort(unsortedPoints);
    polynomial = Array.apply(null, Array(sortedPoints.length)).map(function () {
      return new BN(0);
    });
    for (let i = 0; i < sortedPoints.length; i++) {
      const coefficients = interpolationPoly(i, sortedPoints);
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
  }
  if (!Array.isArray(determinsticShares)) {
    throw TypeError("determinisitc shares in generateRandomPolynomial should be an array");
  }

  if (determinsticShares.length > degree) {
    throw TypeError("determinsticShares in generateRandomPolynomial need to be less than degree to ensure an element of randomness");
  }
  const points = {};
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
  const pointsArr = [];
  Object.keys(points).forEach((shareIndex) => pointsArr.push(points[shareIndex]));
  return (poly = lagrangeInterpolatePolynomial(pointsArr));
}

class Metadata {
  constructor(input) {
    if (input instanceof Point) {
      this.pubKey = input;
      this.publicPolynomials = {};
      this.publicShares = {};
      this.polyIDList = [];
      this.generalStore = {};
    } else if (typeof input === "object") {
      // assumed to be JSON.parsed object
      this.pubKey = new Point(input.pubKey.x, input.pubKey.y);
      this.publicPolynomials = {};
      this.publicShares = {};
      this.polyIDList = input.polyIDList;
      this.generalStore = {};
      if (input.generalStore) this.generalStore = input.generalStore;
      if (input.scopedStore) this.scopedStore = input.scopedStore;
      // for publicPolynomials
      for (const pubPolyID in input.publicPolynomials) {
        const pointCommitments = [];
        input.publicPolynomials[pubPolyID].polynomialCommitments.forEach((commitment) => {
          pointCommitments.push(new Point(commitment.x, commitment.y));
        });
        const publicPolynomial = new PublicPolynomial(pointCommitments);
        this.publicPolynomials[pubPolyID] = publicPolynomial;
      }
      // for publicShares
      for (const pubPolyID in input.publicShares) {
        for (const shareIndex in input.publicShares[pubPolyID]) {
          const newPubShare = new PublicShare(
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
    const polyID = publicPolynomial.getPolynomialID();
    this.publicPolynomials[polyID] = publicPolynomial;
    this.polyIDList.push(polyID);
  }

  addPublicShare(polynomialID, publicShare) {
    if (!(polynomialID in this.publicShares)) {
      this.publicShares[polynomialID] = {};
    }
    this.publicShares[polynomialID][publicShare.shareIndex.toString("hex")] = publicShare;
  }

  setGeneralStoreDomain(key, obj) {
    this.generalStore[key] = obj;
  }

  getGeneralStoreDomain(key) {
    return this.generalStore[key];
  }

  addFromPolynomialAndShares(polynomial, shares) {
    const publicPolynomial = polynomial.getPublicPolynomial();
    this.addPublicPolynomial(publicPolynomial);
    if (Array.isArray(shares)) {
      for (let i = 0; i < shares.length; i++) {
        this.addPublicShare(publicPolynomial.getPolynomialID(), shares[i].getPublicShare());
      }
    } else {
      for (const k in shares) {
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

export { ThresholdBak, Metadata, generateRandomPolynomial, lagrangeInterpolation, lagrangeInterpolatePolynomial };
