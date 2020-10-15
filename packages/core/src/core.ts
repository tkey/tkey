import {
  BNString,
  CatchupToLatestShareResult,
  decrypt,
  encrypt,
  EncryptedMessage,
  GenerateNewShareResult,
  getPubKeyECC,
  getPubKeyPoint,
  IMetadata,
  InitializeNewKeyResult,
  IServiceProvider,
  IStorageLayer,
  ITKey,
  ITKeyApi,
  KEY_NOT_FOUND,
  KeyDetails,
  ModuleMap,
  Point,
  Polynomial,
  PolynomialID,
  prettyPrintError,
  ReconstructedKeyResult,
  ReconstructKeyMiddlewareMap,
  RefreshMiddlewareMap,
  RefreshSharesResult,
  Share,
  ShareSerializationMiddleware,
  ShareStore,
  ShareStoreMap,
  ShareStorePolyIDShareIndexMap,
  StringifiedType,
  TKeyArgs,
  toPrivKeyECC,
} from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import { generateRandomPolynomial, lagrangeInterpolatePolynomial, lagrangeInterpolation } from "./lagrangeInterpolatePolynomial";
import Metadata from "./metadata";

// TODO: handle errors for get and set with retries

class ThresholdKey implements ITKey {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  storageLayer: IStorageLayer;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  tkeyStoreModuleName: string;

  metadata: Metadata;

  refreshMiddleware: RefreshMiddlewareMap;

  reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;

  shareSerializationMiddleware: ShareSerializationMiddleware;

  storeDeviceShare: (deviceShareStore: ShareStore) => Promise<void>;

  constructor(args?: TKeyArgs) {
    const { enableLogging = false, modules = {}, serviceProvider, storageLayer } = args;
    this.enableLogging = enableLogging;
    this.serviceProvider = serviceProvider;
    this.storageLayer = storageLayer;
    this.modules = modules;
    this.shares = {};
    this.privKey = undefined;
    this.refreshMiddleware = {};
    this.reconstructKeyMiddleware = {};
    this.shareSerializationMiddleware = undefined;
    this.storeDeviceShare = undefined;

    this.tkeyStoreModuleName = "tkeyStoreModule";
    this.setModuleReferences(); // Providing ITKeyApi access to modules
  }

  getApi(): ITKeyApi {
    return {
      getMetadata: this.getMetadata.bind(this),
      storageLayer: this.storageLayer,
      initialize: this.initialize.bind(this),
      catchupToLatestShare: this.catchupToLatestShare.bind(this),
      syncShareMetadata: this.syncShareMetadata.bind(this),
      addRefreshMiddleware: this.addRefreshMiddleware.bind(this),
      addReconstructKeyMiddleware: this.addReconstructKeyMiddleware.bind(this),
      addShareSerializationMiddleware: this.addShareSerializationMiddleware.bind(this),
      addShareDescription: this.addShareDescription.bind(this),
      generateNewShare: this.generateNewShare.bind(this),
      inputShareStore: this.inputShareStore.bind(this),
      inputShareStoreSafe: this.inputShareStoreSafe.bind(this),
      outputShareStore: this.outputShareStore.bind(this),
      inputShare: this.inputShare.bind(this),
      outputShare: this.outputShare.bind(this),
      setDeviceStorage: this.setDeviceStorage.bind(this),
      encrypt: this.encrypt.bind(this),
      decrypt: this.decrypt.bind(this),
      getTKeyStore: this.getTKeyStore.bind(this),
      setTKeyStore: this.setTKeyStore.bind(this),
      deleteKey: this.deleteKey.bind(this),
    };
  }

  getMetadata(): IMetadata {
    if (typeof this.metadata !== "undefined") {
      return this.metadata;
    }
    throw new Error("metadata undefined");
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
      const rawServiceProviderShare = await this.storageLayer.getMetadata<{ message?: string }>({ serviceProvider: this.serviceProvider });

      if (rawServiceProviderShare.message === KEY_NOT_FOUND) {
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
    this.inputShareStore(latestShareDetails.latestShare);
    // now that we have metadata we set the requirements for reconstruction

    // initialize modules
    // this.setModuleReferences();
    await this.initializeModules();

    return this.getKeyDetails();
  }

  private setModuleReferences() {
    Object.keys(this.modules).map((x) => this.modules[x].setModuleReferences(this.getApi()));
  }

  private async initializeModules() {
    return Promise.all(Object.keys(this.modules).map((x) => this.modules[x].initialize()));
  }

  /**
   * catchupToLatestShare recursively loops fetches metadata of the provided share and checks if there is an encrypted share for it.
   * @param shareStore share to start of with
   * @param polyID if specified, polyID to refresh to if it exists
   */
  async catchupToLatestShare(shareStore: ShareStore, polyID?: PolynomialID): Promise<CatchupToLatestShareResult> {
    let metadata: StringifiedType;
    try {
      metadata = await this.storageLayer.getMetadata({ privKey: shareStore.share.share });
    } catch (err) {
      throw new Error(`getMetadata in initialize errored: ${prettyPrintError(err)}`);
    }

    let shareMetadata: Metadata;
    try {
      // let nextShare: ShareStore;
      shareMetadata = Metadata.fromJSON(metadata);
      // if matches specified polyID return it
      if (polyID) {
        if (shareStore.polynomialID === polyID) {
          return { latestShare: shareStore, shareMetadata };
        }
      }
      const nextShare = await shareMetadata.getEncryptedShare(shareStore);
      return this.catchupToLatestShare(nextShare);
    } catch (err) {
      return { latestShare: shareStore, shareMetadata };
    }
  }

  async reconstructKey(): Promise<ReconstructedKeyResult> {
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
            const latestShareRes = await this.catchupToLatestShare(sharesForPoly[shareIndexesForPoly[k]], pubPolyID);
            if (latestShareRes.latestShare.polynomialID === pubPolyID) {
              sharesLeft -= 1;
              delete shareIndexesRequired[shareIndexesForPoly[k]];
              this.inputShareStore(latestShareRes.latestShare);
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
    // check that priv key regenerated is correct
    const reconstructedPubKey = getPubKeyPoint(privKey);
    if (this.metadata.pubKey.x.cmp(reconstructedPubKey.x) !== 0) {
      throw new Error(`reconstructed key is not pub key`);
    }
    this.setKey(privKey);

    const returnObject = {
      privKey,
    } as ReconstructedKeyResult;

    // retireve/reconstruct extra keys that live on metadata
    if (Object.keys(this.reconstructKeyMiddleware).length !== 0) {
      let allKeys = [];
      for (const moduleName in this.reconstructKeyMiddleware) {
        if (Object.prototype.hasOwnProperty.call(this.reconstructKeyMiddleware, moduleName)) {
          // eslint-disable-next-line no-await-in-loop
          const extraKeys = await this.reconstructKeyMiddleware[moduleName]();
          returnObject[moduleName] = extraKeys;
          allKeys = allKeys.concat(extraKeys);
        }
      }
      returnObject.allKeys = [privKey].concat(allKeys);
    }

    return returnObject;
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

    // evaluate oldPoly for old shares and create new metadata with encrypted shares for new polynomial

    // evaluate oldPoly for old shares and set new metadata with encrypted share for new polynomial

    const m = this.metadata.clone();
    const newScopedStore = {};
    const sharesToPush = await Promise.all(
      shareIndexesNeedingEncryption.map(async (shareIndex) => {
        const oldShare = oldPoly.polyEval(new BN(shareIndex, "hex"));
        const encryptedShare = await encrypt(getPubKeyECC(oldShare), Buffer.from(JSON.stringify(newShareStores[shareIndex])));
        newScopedStore[getPubKeyPoint(oldShare).x.toString("hex")] = encryptedShare;
        oldShareStores[shareIndex] = new ShareStore(new Share(shareIndex, oldShare), previousPolyID);
        return oldShare;
      })
    );
    m.setScopedStore("encryptedShares", newScopedStore);
    const metadataToPush = Array(sharesToPush.length).fill(m);

    await this.storageLayer.setMetadataBulk({ input: metadataToPush, privKey: sharesToPush });

    // set share for serviceProvider encrytion
    if (shareIndexesNeedingEncryption.includes("1")) {
      await this.storageLayer.setMetadata({ input: newShareStores["1"], serviceProvider: this.serviceProvider });
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
      const me = this.metadata.clone();
      newShareMetadataToPush.push(me);
      return newShareStores[shareIndex].share.share;
    });
    await this.storageLayer.setMetadataBulk({
      input: newShareMetadataToPush,
      serviceProvider: this.serviceProvider,
      privKey: newShareStoreSharesToPush,
    });

    // set metadata for all new shares
    for (let index = 0; index < newShareIndexes.length; index += 1) {
      const shareIndex = newShareIndexes[index];
      this.inputShareStore(newShareStores[shareIndex]);
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
  } = {}): Promise<InitializeNewKeyResult> {
    if (!importedKey) {
      const tmpPriv = generatePrivate();
      this.setKey(new BN(tmpPriv));
    } else {
      this.setKey(new BN(importedKey));
    }

    // create a random poly and respective shares
    // 1 is defined as the serviceProvider share
    const shareIndexForDeviceStorage = generatePrivate();
    const shareIndexes = [new BN(1), new BN(shareIndexForDeviceStorage)];
    let poly: Polynomial;
    if (determinedShare) {
      const shareIndexForDeterminedShare = generatePrivate();
      const userShareIndex = new BN(shareIndexForDeterminedShare);
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
      await this.storageLayer.setMetadata({ input: shareStore, serviceProvider: this.serviceProvider });
    } catch (err) {
      throw new Error(`setMetadata errored: ${JSON.stringify(err)}`);
    }

    const metadataToPush = [];
    const sharesToPush = shareIndexes.map((shareIndex) => {
      metadataToPush.push(metadata);
      return shares[shareIndex.toString("hex")].share;
    });
    await this.storageLayer.setMetadataBulk({ input: metadataToPush, privKey: sharesToPush });

    // store metadata on metadata respective to shares
    for (let index = 0; index < shareIndexes.length; index += 1) {
      const shareIndex = shareIndexes[index];
      // also add into our share store
      this.inputShareStore(new ShareStore(shares[shareIndex.toString("hex")], poly.getPolynomialID()));
    }
    this.metadata = metadata;

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

  inputShareStore(shareStore: ShareStore): void {
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

  // inputs a share ensuring that the share is the latest share AND metadata is updated to its latest state
  async inputShareStoreSafe(shareStore: ShareStore): Promise<void> {
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

  outputShareStore(shareIndex: BNString): ShareStore {
    let shareIndexParsed: BN;
    if (typeof shareIndex === "number") {
      shareIndexParsed = new BN(shareIndex);
    } else if (BN.isBN(shareIndex)) {
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

  getKey(): BN[] {
    return [this.privKey];
  }

  getCurrentShareIndexes(): string[] {
    const latestPolynomial = this.metadata.getLatestPublicPolynomial();
    const latestPolynomialId = latestPolynomial.getPolynomialID();
    const currentShareIndexes = Object.keys(this.shares[latestPolynomialId]);
    return currentShareIndexes;
  }

  getKeyDetails(): KeyDetails {
    const poly = this.metadata.getLatestPublicPolynomial();
    const requiredShares = poly.getThreshold() - Object.keys(this.shares[poly.getPolynomialID()]).length;
    return {
      pubKey: this.metadata.pubKey,
      requiredShares,
      threshold: poly.getThreshold(),
      totalShares: Object.keys(this.metadata.publicShares[poly.getPolynomialID()]).length,
      shareDescriptions: this.metadata.getShareDescription(),
      modules: this.modules,
    };
  }

  // Module functions

  async syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void> {
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

  async syncMultipleShareMetadata(shares: Array<BN>, adjustScopedStore?: (ss: unknown) => unknown): Promise<void> {
    const newMetadataPromise = shares.map(async (share) => {
      const newMetadata = this.metadata.clone();
      let resp: StringifiedType;
      try {
        resp = await this.storageLayer.getMetadata({ privKey: share });
      } catch (err) {
        throw new Error(`getMetadata in syncShareMetadata errored: ${prettyPrintError(err)}`);
      }
      const specificShareMetadata = Metadata.fromJSON(resp);

      let scopedStoreToBeSet;
      if (adjustScopedStore) {
        scopedStoreToBeSet = adjustScopedStore(specificShareMetadata.scopedStore);
      } else {
        scopedStoreToBeSet = specificShareMetadata.scopedStore;
      }
      newMetadata.scopedStore = scopedStoreToBeSet;
      return newMetadata;
    });
    const newMetadata = await Promise.all(newMetadataPromise);
    await this.storageLayer.setMetadataBulk({ input: newMetadata, privKey: shares });
  }

  addRefreshMiddleware(
    moduleName: string,
    middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown
  ): void {
    this.refreshMiddleware[moduleName] = middleware;
  }

  addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void {
    this.reconstructKeyMiddleware[moduleName] = middleware;
  }

  addShareSerializationMiddleware(
    serialize: (share: BN, type: string) => Promise<unknown>,
    deserialize: (serializedShare: unknown, type: string) => Promise<BN>
  ): void {
    this.shareSerializationMiddleware = {
      serialize,
      deserialize,
    };
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

  async encrypt(data: Buffer): Promise<EncryptedMessage> {
    return encrypt(getPubKeyECC(this.privKey), data);
  }

  async decrypt(encryptedMessage: EncryptedMessage): Promise<Buffer> {
    return decrypt(toPrivKeyECC(this.privKey), encryptedMessage);
  }

  async setTKeyStore(moduleName: string, data: unknown): Promise<void> {
    const { metadata } = this;
    const rawTkeyStore = metadata.getTkeyStoreDomain(this.tkeyStoreModuleName) || {};
    rawTkeyStore[moduleName] = {};

    // Encryption promises
    const newData = data;
    const newEncryptedPromises = Object.keys(newData).map((el) => {
      const value = JSON.stringify(data[el]);
      const newBuffer = Buffer.from(value);
      return this.encrypt(newBuffer);
    });

    let encryptedDataArray;
    try {
      encryptedDataArray = await Promise.all(newEncryptedPromises);
    } catch (err) {
      throw new Error("Unable to encrypt data");
    }

    // Type cast as dictionary
    Object.keys(newData).forEach((el, index) => {
      newData[el] = stringify(encryptedDataArray[index]);
      rawTkeyStore[moduleName][el] = newData[el];
    });

    // update metadatStore
    metadata.setTkeyStoreDomain(this.tkeyStoreModuleName, rawTkeyStore);
    await this.syncShareMetadata();
  }

  async deleteKey(moduleName: string, key: string): Promise<void> {
    const { metadata } = this;
    const rawTkeyStore = metadata.getTkeyStoreDomain(this.tkeyStoreModuleName);
    if (!rawTkeyStore) {
      throw new Error("Tkey store does not exist. Unable to delete seed hrase");
    }
    const moduleStore = rawTkeyStore[moduleName];
    const keyStore = moduleStore[key];
    delete keyStore[key];
    metadata.setTkeyStoreDomain(this.tkeyStoreModuleName, keyStore);
    await this.syncShareMetadata();
  }

  async getTKeyStore(moduleName: string, key: string): Promise<unknown> {
    // Get tkey domain
    const { metadata } = this;
    const rawTkeyStore = metadata.getTkeyStoreDomain(this.tkeyStoreModuleName);
    if (!rawTkeyStore) throw new Error("tkey store doesn't exist");

    // get module store
    const moduleStore = rawTkeyStore[moduleName];
    const keyStore = moduleStore[key];

    // decrypt and parsing
    const decryptedKeyStore = await this.decrypt(JSON.parse(keyStore));
    const newString = decryptedKeyStore.toString();
    const tkeyStoreData = JSON.parse(newString.toString());
    return tkeyStoreData;
  }

  // Import export shares
  async outputShare(shareIndex: BNString, type?: string): Promise<unknown> {
    const { share } = this.outputShareStore(shareIndex).share;
    if (!type) return share;

    return this.shareSerializationMiddleware.serialize(share, type);
  }

  async inputShare(share: unknown, type?: string): Promise<void> {
    let shareStore: ShareStore;
    if (!type) shareStore = this.metadata.shareToShareStore(share as BN);
    else {
      const deserialized = await this.shareSerializationMiddleware.deserialize(share, type);
      shareStore = this.metadata.shareToShareStore(deserialized);
    }
    this.inputShareStore(shareStore);
  }

  async linkServiceProvider(serviceProvider: IServiceProvider): Promise<void> {
    const shareStore = this.outputShareStore("1"); // Service provider share
    try {
      await this.storageLayer.setMetadata({ input: shareStore, serviceProvider });
    } catch (err) {
      throw new Error(`setMetadata errored: ${JSON.stringify(err)}`);
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
