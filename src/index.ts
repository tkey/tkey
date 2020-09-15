import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import { getPubKeyPoint, Point, Polynomial, ScopedStore, Share, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "./base";
import {
  CatchupToLatestShareResult,
  GenerateNewShareResult,
  InitializeNewKeyResult,
  ITKey,
  ITKeyApi,
  KeyDetails,
  ModuleMap,
  RefreshMiddlewareMap,
  RefreshSharesResult,
  TKeyArgs,
} from "./baseTypes/aggregateTypes";
import { BNString, IServiceProvider, IStorageLayer, PolynomialID, StringifiedType } from "./baseTypes/commonTypes";
import { generateRandomPolynomial, lagrangeInterpolatePolynomial, lagrangeInterpolation } from "./lagrangeInterpolatePolynomial";
import Metadata from "./metadata";
import TorusServiceProvider from "./serviceProvider/TorusServiceProvider";
import TorusStorageLayer from "./storage-layer";
import { isEmptyObject, prettyPrintError } from "./utils";

// TODO: handle errors for get and set with retries

class ThresholdKey implements ITKey {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  storageLayer: IStorageLayer;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  metadata: Metadata;

  refreshMiddleware: RefreshMiddlewareMap;

  storeDeviceShare: (deviceShareStore: ShareStore) => Promise<void>;

  constructor(args?: TKeyArgs) {
    const { enableLogging = false, modules = {}, serviceProvider, storageLayer, directParams } = args;
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

    this.setModuleReferences();
  }

  getApi(): ITKeyApi {
    return {
      metadata: this.metadata,
      storageLayer: this.storageLayer,
      initialize: this.initialize.bind(this),
      catchupToLatestShare: this.catchupToLatestShare.bind(this),
      syncShareMetadata: this.syncShareMetadata.bind(this),
      addRefreshMiddleware: this.addRefreshMiddleware.bind(this),
      addShareDescription: this.addShareDescription.bind(this),
      generateNewShare: this.generateNewShare.bind(this),
      inputShare: this.inputShare.bind(this),
      inputShareSafe: this.inputShareSafe.bind(this),
      outputShare: this.outputShare.bind(this),
      setDeviceStorage: this.setDeviceStorage.bind(this),
    };
  }

  async initialize(input?: ShareStore, importKey?: BN): Promise<KeyDetails> {
    let shareStore: ShareStore;
    if (input instanceof ShareStore) {
      shareStore = input;
    } else if (typeof input === "object") {
      shareStore = ShareStore.fromJSON(input);
    } else if (!input) {
      // default to use service provider
      // first we see if a share has been kept for us
      const rawServiceProviderShare = await this.storageLayer.getMetadata();

      if (isEmptyObject(rawServiceProviderShare)) {
        // no metadata set, assumes new user
        await this.initializeNewKey({ initializeModules: true, importedKey: importKey });
        return this.getKeyDetails();
      }
      // else we continue with catching up share and metadata
      shareStore = ShareStore.fromJSON(rawServiceProviderShare);
    } else {
      throw new TypeError("Input is not supported");
    }

    // we fetch metadata for the account from the share
    const latestShareDetails = await this.catchupToLatestShare(shareStore);
    this.metadata = latestShareDetails.shareMetadata;
    this.inputShare(latestShareDetails.latestShare);
    // now that we have metadata we set the requirements for reconstruction

    // initialize modules
    this.setModuleReferences();
    await this.initializeModules();

    return this.getKeyDetails();
  }

  private setModuleReferences() {
    Object.keys(this.modules).map((x) => this.modules[x].setModuleReferences(this.getApi()));
  }

  private async initializeModules() {
    return Promise.all(Object.keys(this.modules).map((x) => this.modules[x].initialize()));
  }

  async catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult> {
    let metadata: StringifiedType;
    try {
      metadata = await this.storageLayer.getMetadata(shareStore.share.share);
    } catch (err) {
      throw new Error(`getMetadata in initialize errored: ${prettyPrintError(err)}`);
    }
    let shareMetadata: Metadata;
    let nextShare: ShareStore;
    try {
      shareMetadata = Metadata.fromJSON(metadata);
      nextShare = shareMetadata.getEncryptedShare();
      return this.catchupToLatestShare(nextShare);
    } catch (err) {
      return { latestShare: shareStore, shareMetadata };
    }
  }

  async reconstructKey(): Promise<BN> {
    if (!this.metadata) {
      throw new Error("metadata not found, SDK likely not intialized");
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const requiredThreshold = pubPoly.getThreshold();
    const pubPolyID = pubPoly.getPolynomialID();

    // check if we have enough shares to meet threshold
    let sharesLeft = requiredThreshold;
    // we don't just check the latest poly but
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
            // eslint-disable-next-line no-await-in-loop
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
      throw new Error(`not enough shares for reconstruction, require ${requiredThreshold} but have ${sharesLeft - requiredThreshold}`);
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

  reconstructLatestPoly(): Polynomial {
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const pubPolyID = pubPoly.getPolynomialID();
    const threshold = pubPoly.getThreshold();

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[pubPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw new Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i += 1) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[pubPolyID][sharesForExistingPoly[i]].share.share));
    }
    return lagrangeInterpolatePolynomial(pointsArr);
  }

  async generateNewShare(): Promise<GenerateNewShareResult> {
    if (!this.metadata) {
      throw new Error("metadata not found, SDK likely not intialized");
    }
    if (!this.privKey) {
      throw new Error("Private key not available. please reconstruct key first");
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
    if (!this.privKey) {
      throw new Error("Private key not available. please reconstruct key first");
    }
    const poly = generateRandomPolynomial(threshold - 1, this.privKey);
    const shares = poly.generateShares(newShareIndexes);
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[previousPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw new Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i += 1) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[previousPolyID][sharesForExistingPoly[i]].share.share));
    }
    const oldPoly = lagrangeInterpolatePolynomial(pointsArr);

    const shareIndexesNeedingEncryption: string[] = [];
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
      newShareStores[shareIndexHex] = new ShareStore(shares[shareIndexHex], polyID);
    });

    // evaluate oldPoly for old shares and set new metadata with encrypted share for new polynomial
    const metadataToPush = [];
    const sharesToPush = shareIndexesNeedingEncryption.map((shareIndex) => {
      const m = this.metadata.clone();
      m.setScopedStore({ encryptedShare: newShareStores[shareIndex] });
      metadataToPush.push(m);
      const oldShare = oldPoly.polyEval(new BN(shareIndex, "hex"));
      oldShareStores[shareIndex] = new ShareStore(new Share(shareIndex, oldShare), previousPolyID);
      return oldShare;
    });
    await this.storageLayer.setMetadataBulk(metadataToPush, sharesToPush);

    // set share for serviceProvider encrytion
    if (shareIndexesNeedingEncryption.includes("1")) {
      await this.storageLayer.setMetadata(newShareStores["1"]);
      // TODO: handle failure gracefully
    }

    // run refreshShare middleware
    for (const moduleName in this.refreshMiddleware) {
      if (Object.prototype.hasOwnProperty.call(this.refreshMiddleware, moduleName)) {
        const adjustedGeneralStore = this.refreshMiddleware[moduleName](
          this.metadata.getGeneralStoreDomain(moduleName),
          oldShareStores,
          newShareStores
        );
        this.metadata.setGeneralStoreDomain(moduleName, adjustedGeneralStore);
      }
    }

    // await Promise.all(
    const newShareMetadataToPush = [];
    const newShareStoreSharesToPush = newShareIndexes.map((shareIndex) => {
      const m = this.metadata.clone();
      newShareMetadataToPush.push(m);
      return newShareStores[shareIndex].share.share;
    });
    await this.storageLayer.setMetadataBulk(newShareMetadataToPush, newShareStoreSharesToPush);

    // set metadata for all new shares
    for (let index = 0; index < newShareIndexes.length; index += 1) {
      const shareIndex = newShareIndexes[index];
      this.inputShare(newShareStores[shareIndex]);
    }

    return { shareStores: newShareStores };
  }

  async initializeNewKey({
    determinedShare,
    initializeModules,
    importedKey,
  }: {
    determinedShare?: BN;
    initializeModules?: boolean;
    importedKey?: BN;
  }): Promise<InitializeNewKeyResult> {
    if (!importedKey) {
      const tmpPriv = generatePrivate();
      this.setKey(new BN(tmpPriv));
    } else {
      this.setKey(new BN(importedKey));
    }

    // create a random poly and respective shares
    // 1 is defined as the serviceProvider share
    const shareIndexes = [new BN(1), new BN(2)];
    let poly: Polynomial;
    if (determinedShare) {
      const userShareIndex = new BN(3);
      poly = generateRandomPolynomial(1, this.privKey, [new Share(userShareIndex, determinedShare)]);
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
    const shareStore = new ShareStore(serviceProviderShare, poly.getPolynomialID());
    try {
      await this.storageLayer.setMetadata(shareStore);
    } catch (err) {
      throw new Error(`setMetadata errored: ${prettyPrintError(err)}`);
    }

    const metadataToPush = [];
    const sharesToPush = shareIndexes.map((shareIndex) => {
      metadataToPush.push(metadata);
      return shares[shareIndex.toString("hex")].share;
    });
    await this.storageLayer.setMetadataBulk(metadataToPush, sharesToPush);

    // store metadata on metadata respective to shares
    for (let index = 0; index < shareIndexes.length; index += 1) {
      const shareIndex = shareIndexes[index];
      // also add into our share store
      this.inputShare(new ShareStore(shares[shareIndex.toString("hex")], poly.getPolynomialID()));
    }
    this.metadata = metadata;

    this.setModuleReferences();
    // initialize modules
    if (initializeModules) {
      await this.initializeModules();
    }

    if (this.storeDeviceShare) {
      await this.storeDeviceShare(new ShareStore(shares[shareIndexes[1].toString("hex")], poly.getPolynomialID()));
    }

    const result = {
      privKey: this.privKey,
      deviceShare: new ShareStore(shares[shareIndexes[1].toString("hex")], poly.getPolynomialID()),
      userShare: undefined,
    };
    if (determinedShare) {
      result.userShare = new ShareStore(shares[shareIndexes[2].toString("hex")], poly.getPolynomialID());
    }
    return result;
  }

  inputShare(shareStore: ShareStore): void {
    let ss: ShareStore;
    if (shareStore instanceof ShareStore) {
      ss = shareStore;
    } else if (typeof shareStore === "object") {
      ss = ShareStore.fromJSON(shareStore);
    } else {
      throw new TypeError("can only add type ShareStore into shares");
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
      ss = ShareStore.fromJSON(shareStore);
    } else {
      throw new TypeError("can only add type ShareStore into shares");
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

    const latestPolyID = this.metadata.getLatestPublicPolynomial().getPolynomialID();
    if (!this.metadata.publicShares[latestPolyID][shareIndexParsed.toString("hex")]) {
      throw new Error("no such share index created");
    }
    const shareFromStore = this.shares[latestPolyID][shareIndexParsed.toString("hex")];
    if (shareFromStore) return shareFromStore;
    const poly = this.reconstructLatestPoly();
    const shareMap = poly.generateShares([shareIndexParsed]);

    return new ShareStore(shareMap[shareIndexParsed.toString("hex")], latestPolyID);
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
      throw new Error("not enough shares to reconstruct poly");
    }
    for (let i = 0; i < threshold; i += 1) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[pubPolyID][sharesForExistingPoly[i]].share.share));
    }
    const currentPoly = lagrangeInterpolatePolynomial(pointsArr);
    const allExistingShares = currentPoly.generateShares(existingShareIndexes);

    const shareArray = existingShareIndexes.map((shareIndex) => allExistingShares[shareIndex].share);
    await this.syncMultipleShareMetadata(shareArray, adjustScopedStore);
  }

  async syncMultipleShareMetadata(shares: Array<BN>, adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void> {
    const newMetadataPromise = shares.map(async (share) => {
      const newMetadata = this.metadata.clone();
      let resp: StringifiedType;
      try {
        resp = await this.storageLayer.getMetadata(share);
      } catch (err) {
        throw new Error(`getMetadata in syncShareMetadata errored: ${prettyPrintError(err)}`);
      }
      const specificShareMetadata = Metadata.fromJSON(resp);

      let scopedStoreToBeSet: ScopedStore;
      if (adjustScopedStore) {
        scopedStoreToBeSet = adjustScopedStore(specificShareMetadata.scopedStore);
      } else {
        scopedStoreToBeSet = specificShareMetadata.scopedStore;
      }
      newMetadata.setScopedStore(scopedStoreToBeSet);
      return newMetadata;
    });
    const newMetadata = await Promise.all(newMetadataPromise);
    await this.storageLayer.setMetadataBulk(newMetadata, shares);
  }

  async syncSingleShareMetadata(share: BN, adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void> {
    const newMetadata = this.metadata.clone();
    let resp: StringifiedType;
    try {
      resp = await this.storageLayer.getMetadata(share);
    } catch (err) {
      throw new Error(`getMetadata in syncShareMetadata errored: ${prettyPrintError(err)}`);
    }
    const specificShareMetadata = Metadata.fromJSON(resp);

    let scopedStoreToBeSet: ScopedStore;
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
      throw new Error("storeDeviceShare already set");
    }
    this.storeDeviceShare = storeDeviceStorage;
  }

  async addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void> {
    this.metadata.addShareDescription(shareIndex, description);
    if (updateMetadata) {
      await this.syncShareMetadata();
    }
  }

  async deleteShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void> {
    this.metadata.deleteShareDescription(shareIndex, description);
    if (updateMetadata) {
      await this.syncShareMetadata();
    }
  }

  toJSON(): StringifiedType {
    return {
      shares: this.shares,
      enableLogging: this.enableLogging,
      privKey: this.privKey ? this.privKey.toString("hex") : undefined,
      metadata: this.metadata,
    };
  }

  static async fromJSON(value: StringifiedType, args: TKeyArgs): Promise<ThresholdKey> {
    const { enableLogging, privKey, metadata, shares } = value;
    const { storageLayer, serviceProvider, modules } = args;
    const tb = new ThresholdKey({ enableLogging, storageLayer, serviceProvider, modules });
    if (privKey) tb.privKey = new BN(privKey, "hex");
    if (metadata) tb.metadata = Metadata.fromJSON(metadata);

    for (const key in shares) {
      if (Object.prototype.hasOwnProperty.call(shares, key)) {
        const shareStoreMapElement = shares[key];
        for (const shareElementKey in shareStoreMapElement) {
          if (Object.prototype.hasOwnProperty.call(shareStoreMapElement, shareElementKey)) {
            let shareStore = shareStoreMapElement[shareElementKey];
            shareStore = ShareStore.fromJSON(shareStore);
          }
        }
      }
    }
    tb.shares = shares;
    await tb.initialize();
    return tb;
  }
}

export default ThresholdKey;
