/* eslint-disable no-use-before-define */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable prefer-spread */
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import {
  CatchupToLatestShareResult,
  GenerateNewShareResult,
  InitializeNewKeyResult,
  IThresholdBak,
  KeyDetails,
  ModuleMap,
  RefreshMiddlewareMap,
  RefreshSharesResult,
  ThresholdBakArgs,
} from "./base/aggregateTypes";
import { getPubKeyPoint } from "./base/BNUtils";
import { BNString, IServiceProvider, IStorageLayer, PolynomialID } from "./base/commonTypes";
import Point from "./base/Point";
import { Polynomial } from "./base/Polynomial";
import Share from "./base/Share";
import ShareStore, { ScopedStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "./base/ShareStore";
import Metadata from "./metadata";
import TorusServiceProvider from "./serviceProvider/TorusServiceProvider";
import TorusStorageLayer from "./storage-layer";
import { ecCurve, isEmptyObject } from "./utils";

// TODO: handle errors for get and set with retries

class ThresholdBak implements IThresholdBak {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  storageLayer: IStorageLayer;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  metadata: Metadata;

  refreshMiddleware: RefreshMiddlewareMap;

  storeDeviceShare: (deviceShareStore: ShareStore) => Promise<void>;

  constructor({ enableLogging = false, modules = {}, serviceProvider, storageLayer, directParams }: ThresholdBakArgs) {
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
    this.privKey = undefined;
    this.refreshMiddleware = {};
    this.storeDeviceShare = undefined;
  }

  async initialize(input: ShareStore): Promise<KeyDetails> {
    let shareStore;
    if (input instanceof ShareStore) {
      shareStore = input;
    } else if (typeof input === "object") {
      shareStore = new ShareStore(input);
    } else if (!input) {
      // default to use service provider
      // first we see if a share has been kept for us
      const rawServiceProviderShare = await this.storageLayer.getMetadata();

      if (isEmptyObject(rawServiceProviderShare)) {
        // no metadata set, assumes new user
        await this.initializeNewKey(undefined, true);
        return this.getKeyDetails();
      }
      // else we continue with catching up share and metadata
      shareStore = new ShareStore(rawServiceProviderShare as ShareStore);
    } else {
      throw TypeError("Input is not supported");
    }

    // we fetch metadata for the account from the share
    const latestShareDetails = await this.catchupToLatestShare(shareStore);
    this.metadata = latestShareDetails.shareMetadata;
    this.inputShare(latestShareDetails.latestShare);
    // now that we have metadata we set the requirements for reconstruction

    // initialize modules
    for (const moduleName in this.modules) {
      await this.modules[moduleName].initialize(this);
    }

    return this.getKeyDetails();
  }

  async catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult> {
    let metadata;
    try {
      metadata = await this.storageLayer.getMetadata(shareStore.share.share);
    } catch (err) {
      throw new Error(`getMetadata in initialize errored: ${err}`);
    }
    let shareMetadata;
    let nextShare;
    try {
      shareMetadata = new Metadata(metadata);
      nextShare = new ShareStore(shareMetadata.getEncryptedShare());
      return this.catchupToLatestShare(nextShare);
    } catch (err) {
      return { latestShare: shareStore, shareMetadata };
    }
  }

  async reconstructKey(): Promise<BN> {
    if (!this.metadata) {
      throw Error("metadata not found, SDK likely not intialized");
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const requiredThreshold = pubPoly.getThreshold();
    const pubPolyID = pubPoly.getPolynomialID();

    // check if we have enough shares to meet threshold
    let sharesLeft = requiredThreshold;
    // we don't jsut check the latest poly but
    //  we check if the shares on previous polynomials in our stores have the share indexes we require
    const fullShareList = Object.keys(this.metadata.publicShares[pubPolyID]);
    const shareIndexesRequired = {};
    for (let i = 0; i < fullShareList.length; i += 1) {
      shareIndexesRequired[fullShareList[i]] = true;
    }
    for (let z = this.metadata.polyIDList.length - 1; z >= 0 && sharesLeft > 0; z -= 1) {
      const sharesForPoly = this.shares[this.metadata.polyIDList[z]];
      if (sharesForPoly) {
        const shareIndexesForPoly = Object.keys(sharesForPoly);
        for (let k = 0; k < shareIndexesForPoly.length && sharesLeft > 0; k += 1) {
          if (shareIndexesForPoly[k] in shareIndexesRequired) {
            const latestShareRes = await this.catchupToLatestShare(sharesForPoly[shareIndexesForPoly[k]]);
            if (latestShareRes.latestShare.polynomialID === pubPolyID) {
              sharesLeft -= 1;
              delete shareIndexesRequired[shareIndexesForPoly[k]];
              this.inputShare(latestShareRes.latestShare);
            }
          }
        }
      }
    }
    if (sharesLeft > 0) {
      throw Error(`not enough shares for reconstruction, require ${requiredThreshold} but have ${sharesLeft - requiredThreshold}`);
    }

    const polyShares = Object.keys(this.shares[pubPolyID]);
    const shareArr = [];
    const shareIndexArr = [];
    for (let i = 0; i < requiredThreshold; i += 1) {
      shareArr.push(this.shares[pubPolyID][polyShares[i]].share.share);
      shareIndexArr.push(this.shares[pubPolyID][polyShares[i]].share.shareIndex);
    }
    const privKey = lagrangeInterpolation(shareArr, shareIndexArr);
    this.setKey(privKey);
    return this.privKey;
  }

  async generateNewShare(): Promise<GenerateNewShareResult> {
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

  async refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult> {
    const poly = generateRandomPolynomial(threshold - 1, this.privKey);
    const shares = poly.generateShares(newShareIndexes);
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[previousPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i += 1) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[previousPolyID][sharesForExistingPoly[i]].share.share));
    }
    const oldPoly = lagrangeInterpolatePolynomial(pointsArr);

    const shareIndexesNeedingEncryption = [];
    for (let index = 0; index < existingShareIndexes.length; index += 1) {
      const shareIndexHex = existingShareIndexes[index];
      // define shares that need encryption/relaying
      if (newShareIndexes.includes(shareIndexHex)) {
        shareIndexesNeedingEncryption.push(shareIndexHex);
      }
    }

    // add metadata new poly to metadata
    this.metadata.addFromPolynomialAndShares(poly, shares);

    // change to share stores for public storing
    const oldShareStores = {};
    const newShareStores = {};
    const polyID = poly.getPolynomialID();
    newShareIndexes.forEach((shareIndexHex) => {
      newShareStores[shareIndexHex] = new ShareStore({ share: shares[shareIndexHex], polynomialID: polyID });
    });

    // evaluate oldPoly for old shares and set new metadata with encrypted share for new polynomial
    for (let index = 0; index < shareIndexesNeedingEncryption.length; index += 1) {
      const shareIndex = shareIndexesNeedingEncryption[index];
      const m = this.metadata.clone();
      m.setScopedStore({ encryptedShare: newShareStores[shareIndex] });
      const oldShare = oldPoly.polyEval(new BN(shareIndex, "hex"));
      oldShareStores[shareIndex] = new ShareStore({ share: new Share(shareIndex, oldShare), polynomialID: previousPolyID });
      await this.storageLayer.setMetadata(m, oldShare);
    }

    // set share for serviceProvider encrytion
    if (shareIndexesNeedingEncryption.includes("1")) {
      await this.storageLayer.setMetadata(newShareStores["1"]);
      // TODO: handle failure gracefully
    }

    // run refreshShare middleware
    for (let index = 0; index < Object.keys(this.refreshMiddleware).length; index += 1) {
      const moduleName = Object.keys(this.refreshMiddleware)[index];
      const adjustedGeneralStore = this.refreshMiddleware[moduleName](
        this.metadata.getGeneralStoreDomain(moduleName),
        oldShareStores,
        newShareStores
      );
      this.metadata.setGeneralStoreDomain(moduleName, adjustedGeneralStore);
    }

    // set metadata for all new shares
    for (let index = 0; index < newShareIndexes.length; index += 1) {
      const shareIndex = newShareIndexes[index];
      const m = this.metadata.clone();
      await this.storageLayer.setMetadata(m, newShareStores[shareIndex].share.share);

      this.inputShare(newShareStores[shareIndex]);
    }

    return { shareStores: newShareStores };
  }

  async initializeNewKey(userInput?: BN, initializeModules?: boolean): Promise<InitializeNewKeyResult> {
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
    const metadata = new Metadata(getPubKeyPoint(this.privKey));
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
    for (let index = 0; index < shareIndexes.length; index += 1) {
      const shareIndex = shareIndexes[index];
      await this.storageLayer.setMetadata(metadata, shares[shareIndex.toString("hex")].share);
      // also add into our share store
      this.inputShare(new ShareStore({ share: shares[shareIndex.toString("hex")], polynomialID: poly.getPolynomialID() }));
    }
    this.metadata = metadata;

    // initialize modules
    if (initializeModules) {
      for (const moduleName in this.modules) {
        await this.modules[moduleName].initialize(this);
      }
    }

    if (this.storeDeviceShare) {
      await this.storeDeviceShare(new ShareStore({ share: shares[shareIndexes[1].toString("hex")], polynomialID: poly.getPolynomialID() }));
    }

    const result = {
      privKey: this.privKey,
      deviceShare: new ShareStore({ share: shares[shareIndexes[1].toString("hex")], polynomialID: poly.getPolynomialID() }),
      userShare: undefined,
    };
    if (userInput) {
      result.userShare = new ShareStore({ share: shares[shareIndexes[2].toString("hex")], polynomialID: poly.getPolynomialID() });
    }
    return result;
  }

  inputShare(shareStore: ShareStore): void {
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

  // inputs a share ensuring that the share is the latest share AND metadata is udpated to its latest state
  async inputShareSafe(shareStore: ShareStore): Promise<void> {
    let ss;
    if (shareStore instanceof ShareStore) {
      ss = shareStore;
    } else if (typeof shareStore === "object") {
      ss = new ShareStore(shareStore);
    } else {
      throw TypeError("can only add type ShareStore into shares");
    }
    const latestShareRes = await this.catchupToLatestShare(ss);
    // if not in poly id list, metadata is probably outdated
    if (!this.metadata.polyIDList.includes(latestShareRes.latestShare.polynomialID)) {
      this.metadata = latestShareRes.shareMetadata;
    }
    if (!(latestShareRes.latestShare.polynomialID in this.shares)) {
      this.shares[latestShareRes.latestShare.polynomialID] = {};
    }
    this.shares[latestShareRes.latestShare.polynomialID][latestShareRes.latestShare.share.shareIndex.toString("hex")] = latestShareRes.latestShare;
  }

  outputShare(shareIndex: BNString): ShareStore {
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

  setKey(privKey: BN): void {
    this.privKey = privKey;
  }

  getKeyDetails(): KeyDetails {
    const poly = this.metadata.getLatestPublicPolynomial();
    const requiredShares = poly.getThreshold() - Object.keys(this.shares[poly.getPolynomialID()]).length;
    return {
      pubKey: this.metadata.pubKey,
      requiredShares,
      threshold: poly.getThreshold(),
      totalShares: Object.keys(this.metadata.publicShares[poly.getPolynomialID()]).length,
      shareDescriptions: this.metadata.shareDescriptions,
      modules: this.modules,
    };
  }

  // Module functions

  async syncShareMetadata(adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void> {
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const pubPolyID = pubPoly.getPolynomialID();
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(pubPolyID);
    const threshold = pubPoly.getThreshold();

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[pubPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i += 1) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[pubPolyID][sharesForExistingPoly[i]].share.share));
    }
    const currentPoly = lagrangeInterpolatePolynomial(pointsArr);
    const allExistingShares = currentPoly.generateShares(existingShareIndexes);

    for (let index = 0; index < existingShareIndexes.length; index += 1) {
      const shareIndex = existingShareIndexes[index];
      await this.syncSingleShareMetadata(allExistingShares[shareIndex].share, adjustScopedStore);
    }
  }

  async syncSingleShareMetadata(share: BN, adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void> {
    const newMetadata = this.metadata.clone();
    let resp;
    try {
      resp = await this.storageLayer.getMetadata(share);
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
    await this.storageLayer.setMetadata(newMetadata, share);
  }

  addRefreshMiddleware(
    moduleName: string,
    middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown
  ): void {
    this.refreshMiddleware[moduleName] = middleware;
  }

  setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void {
    if (this.storeDeviceShare) {
      throw Error("storeDeviceShare already set");
    }
    this.storeDeviceShare = storeDeviceStorage;
  }

  async addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void> {
    this.metadata.addShareDescription(shareIndex, description);
    if (updateMetadata) {
      await this.syncShareMetadata();
    }
  }
}

// PRIMATIVES (TODO: MOVE TYPES AND THIS INTO DIFFERENT FOLDER)

function lagrangeInterpolatePolynomial(points: Array<Point>): Polynomial {
  const denominator = function (i: number, innerPoints: Array<Point>) {
    let result = new BN(1);
    const xi = innerPoints[i].x;
    for (let j = innerPoints.length - 1; j >= 0; j -= 1) {
      if (i !== j) {
        let tmp = new BN(xi);
        tmp = tmp.sub(innerPoints[j].x);
        tmp = tmp.umod(ecCurve.curve.n);
        result = result.mul(tmp);
        result = result.umod(ecCurve.curve.n);
      }
    }
    return result;
  };

  const interpolationPoly = function (i: number, innerPoints: Array<Point>): Array<BN> {
    let coefficients = Array.apply(null, Array(innerPoints.length)).map(function () {
      return new BN(0);
    });
    const d = denominator(i, innerPoints);
    coefficients[0] = d.invm(ecCurve.curve.n);
    for (let k = 0; k < innerPoints.length; k += 1) {
      const newCoefficients = Array.apply(null, Array(innerPoints.length)).map(function () {
        return new BN(0);
      });
      if (k === i) {
        // eslint-disable-next-line no-continue
        continue;
      }
      let j;
      if (k < i) {
        j = k + 1;
      } else {
        j = k;
      }
      j -= 1;
      for (; j >= 0; j -= 1) {
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
    const sortedPoints = [...innerPoints];
    sortedPoints.sort(function (a, b) {
      return a.x.cmp(b.x);
    });
    return sortedPoints;
  };

  const lagrange = function (unsortedPoints) {
    const sortedPoints = pointSort(unsortedPoints);
    const polynomial = Array.apply(null, Array(sortedPoints.length)).map(function () {
      return new BN(0);
    });
    for (let i = 0; i < sortedPoints.length; i += 1) {
      const coefficients = interpolationPoly(i, sortedPoints);
      for (let k = 0; k < sortedPoints.length; k += 1) {
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

function lagrangeInterpolation(shares: Array<BN>, nodeIndex: Array<BN>): BN {
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
function generateRandomPolynomial(degree: number, secret?: BN, determinsticShares?: Array<Share>): Polynomial {
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
  for (let i = 0; i < degree - determinsticShares.length; i += 1) {
    let shareIndex = new BN(generatePrivate());
    while (Object.keys(points).includes(shareIndex.toString("hex"))) {
      shareIndex = new BN(generatePrivate());
    }
    points[shareIndex.toString("hex")] = new Point(shareIndex, new BN(generatePrivate()));
  }
  points["0"] = new Point(new BN(0), actualS);
  const pointsArr = [];
  Object.keys(points).forEach((shareIndex) => pointsArr.push(points[shareIndex]));
  return lagrangeInterpolatePolynomial(pointsArr);
}

export { ThresholdBak, Metadata, generateRandomPolynomial, lagrangeInterpolation, lagrangeInterpolatePolynomial };
