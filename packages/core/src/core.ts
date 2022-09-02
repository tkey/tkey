import {
  BNString,
  CatchupToLatestShareResult,
  decrypt,
  DeleteShareResult,
  encrypt,
  EncryptedMessage,
  FromJSONConstructor,
  GenerateNewShareResult,
  generatePrivateExcludingIndexes,
  getPubKeyECC,
  getPubKeyPoint,
  IMessageMetadata,
  IMetadata,
  InitializeNewKeyResult,
  IServiceProvider,
  IStorageLayer,
  ITKey,
  ITKeyApi,
  KEY_NOT_FOUND,
  KeyDetails,
  LocalMetadataTransitions,
  LocalTransitionData,
  LocalTransitionShares,
  ModuleMap,
  ONE_KEY_DELETE_NONCE,
  Point,
  Polynomial,
  PolynomialID,
  prettyPrintError,
  ReconstructedKeyResult,
  ReconstructKeyMiddlewareMap,
  RefreshMiddlewareMap,
  RefreshSharesResult,
  Share,
  SHARE_DELETED,
  ShareSerializationMiddleware,
  ShareStore,
  ShareStoreMap,
  ShareStorePolyIDShareIndexMap,
  StringifiedType,
  TKeyArgs,
  TkeyStoreItemType,
  toPrivKeyECC,
} from "@tkey/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import AuthMetadata from "./authMetadata";
import CoreError from "./errors";
import { generateRandomPolynomial, lagrangeInterpolatePolynomial, lagrangeInterpolation, lagrangePublicPoints } from "./lagrangeInterpolatePolynomial";
import Metadata from "./metadata";

// TODO: handle errors for get and set with retries

class ThresholdKey implements ITKey {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  storageLayer: IStorageLayer;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  lastFetchedCloudMetadata: Metadata;

  metadata: Metadata;

  manualSync: boolean;

  _localMetadataTransitions: LocalMetadataTransitions;

  _refreshMiddleware: RefreshMiddlewareMap;

  _reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;

  _shareSerializationMiddleware: ShareSerializationMiddleware;

  storeDeviceShare: (deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType) => Promise<void>;

  haveWriteMetadataLock: string;

  tssClientShare: Share;

  constructor(args?: TKeyArgs) {
    const { enableLogging = false, modules = {}, serviceProvider, storageLayer, manualSync = false } = args || {};
    this.enableLogging = enableLogging;
    this.serviceProvider = serviceProvider;
    this.storageLayer = storageLayer;
    this.modules = modules;
    this.shares = {};
    this.privKey = undefined;
    this.manualSync = manualSync;
    this._refreshMiddleware = {};
    this._reconstructKeyMiddleware = {};
    this._shareSerializationMiddleware = undefined;
    this.storeDeviceShare = undefined;
    this._localMetadataTransitions = [[], []];
    this.setModuleReferences(); // Providing ITKeyApi access to modules
    this.haveWriteMetadataLock = "";
  }

  static async fromJSON(value: StringifiedType, args: TKeyArgs): Promise<ThresholdKey> {
    const { enableLogging, privKey, metadata, shares, _localMetadataTransitions, manualSync, lastFetchedCloudMetadata } = value;
    const { storageLayer, serviceProvider, modules } = args;

    const tb = new ThresholdKey({
      enableLogging,
      storageLayer,
      serviceProvider,
      modules,
      manualSync,
    });
    if (privKey) tb.privKey = new BN(privKey, "hex");

    for (const key in shares) {
      if (Object.prototype.hasOwnProperty.call(shares, key)) {
        const shareStoreMapElement = shares[key];
        for (const shareElementKey in shareStoreMapElement) {
          if (Object.prototype.hasOwnProperty.call(shareStoreMapElement, shareElementKey)) {
            const shareStore = shareStoreMapElement[shareElementKey];
            shareStoreMapElement[shareElementKey] = ShareStore.fromJSON(shareStore);
          }
        }
      }
    }
    tb.shares = shares;

    // switch to deserialize local metadata transition based on Object.keys() of authMetadata, ShareStore's and, IMessageMetadata
    const AuthMetdataKeys = Object.keys(JSON.parse(stringify(new AuthMetadata(new Metadata(new Point("0", "0")), new BN("0", "hex")))));
    const ShareStoreKeys = Object.keys(JSON.parse(stringify(new ShareStore(new Share("0", "0"), "", new Share("0", "0")))));
    const sampleMessageMetadata: IMessageMetadata = { message: "Sample message", dateAdded: Date.now() };
    const MessageMetadataKeys = Object.keys(sampleMessageMetadata);

    const localTransitionShares: LocalTransitionShares = [];
    const localTransitionData: LocalTransitionData = [];

    _localMetadataTransitions[0].forEach((x, index) => {
      if (x) {
        localTransitionShares.push(new BN(x, "hex"));
      } else {
        localTransitionShares.push(undefined);
      }

      const keys = Object.keys(_localMetadataTransitions[1][index]);
      if (keys.length === AuthMetdataKeys.length && keys.every((val) => AuthMetdataKeys.includes(val))) {
        const tempAuth = AuthMetadata.fromJSON(_localMetadataTransitions[1][index]);
        tempAuth.privKey = privKey;
        localTransitionData.push(tempAuth);
      } else if (keys.length === ShareStoreKeys.length && keys.every((val) => ShareStoreKeys.includes(val))) {
        localTransitionData.push(ShareStore.fromJSON(_localMetadataTransitions[1][index]));
      } else if (keys.length === MessageMetadataKeys.length && keys.every((val) => MessageMetadataKeys.includes(val))) {
        localTransitionData.push(_localMetadataTransitions[1][index] as IMessageMetadata);
      } else {
        throw CoreError.default("fromJSON failed. Could not deserialise _localMetadataTransitions");
      }
    });

    if (metadata || lastFetchedCloudMetadata) {
      let tempMetadata: Metadata;
      let tempCloud: Metadata;
      let shareToUseForSerialization: ShareStore;

      // if service provider key is missing, we should initialize with one of the existing shares
      // TODO: fix for deleted share
      if (tb.serviceProvider.postboxKey.toString("hex") === "0") {
        const latestPolyIDOnCloud = Metadata.fromJSON(lastFetchedCloudMetadata).getLatestPublicPolynomial().getPolynomialID();
        const shareIndexesExistInSDK = Object.keys(shares[latestPolyIDOnCloud]);
        const randomIndex = shareIndexesExistInSDK[Math.floor(Math.random() * (shareIndexesExistInSDK.length - 1))];
        if (shareIndexesExistInSDK.length >= 1) {
          shareToUseForSerialization = shares[latestPolyIDOnCloud][randomIndex];
        }
      }
      if (metadata) tempMetadata = Metadata.fromJSON(metadata);
      if (lastFetchedCloudMetadata) tempCloud = Metadata.fromJSON(lastFetchedCloudMetadata);
      await tb.initialize({
        neverInitializeNewKey: true,
        transitionMetadata: tempMetadata,
        previouslyFetchedCloudMetadata: tempCloud,
        previousLocalMetadataTransitions: [localTransitionShares, localTransitionData],
        withShare: shareToUseForSerialization,
      });
    } else {
      await tb.initialize({ neverInitializeNewKey: true });
    }
    return tb;
  }

  getStorageLayer(): IStorageLayer {
    return this.storageLayer;
  }

  getMetadata(): IMetadata {
    if (typeof this.metadata !== "undefined") {
      return this.metadata;
    }

    throw CoreError.metadataUndefined();
  }

  async initialize(params?: {
    withShare?: ShareStore;
    importKey?: BN;
    neverInitializeNewKey?: boolean;
    transitionMetadata?: Metadata;
    previouslyFetchedCloudMetadata?: Metadata;
    previousLocalMetadataTransitions?: LocalMetadataTransitions;
    delete1OutOf1?: boolean;
  }): Promise<KeyDetails> {
    // setup initial params/states
    const p = params || {};

    if (p.delete1OutOf1 && !this.manualSync) throw CoreError.delete1OutOf1OnlyManualSync();

    const { withShare, importKey, neverInitializeNewKey, transitionMetadata, previouslyFetchedCloudMetadata, previousLocalMetadataTransitions } = p;

    const previousLocalMetadataTransitionsExists =
      previousLocalMetadataTransitions && previousLocalMetadataTransitions[0].length > 0 && previousLocalMetadataTransitions[1].length > 0;
    const reinitializing = transitionMetadata && previousLocalMetadataTransitionsExists; // are we reinitializing the SDK?
    // in the case we're reinitializing whilst newKeyAssign has not been synced
    const reinitializingWithNewKeyAssign = reinitializing && previouslyFetchedCloudMetadata === undefined;

    let shareStore: ShareStore;
    if (withShare instanceof ShareStore) {
      shareStore = withShare;
    } else if (typeof withShare === "object") {
      shareStore = ShareStore.fromJSON(withShare);
    } else if (!withShare) {
      // default to use service provider
      // first we see if a share has been kept for us
      const spIncludeLocalMetadataTransitions = reinitializingWithNewKeyAssign;
      const spLocalMetadataTransitions = reinitializingWithNewKeyAssign ? previousLocalMetadataTransitions : undefined;
      const rawServiceProviderShare = await this.getGenericMetadataWithTransitionStates({
        serviceProvider: this.serviceProvider,
        includeLocalMetadataTransitions: spIncludeLocalMetadataTransitions,
        _localMetadataTransitions: spLocalMetadataTransitions,
        fromJSONConstructor: {
          fromJSON(val: StringifiedType) {
            return val;
          },
        },
      });
      const noKeyFound: { message?: string } = rawServiceProviderShare as { message?: string };
      if (noKeyFound.message === KEY_NOT_FOUND) {
        if (neverInitializeNewKey) {
          throw CoreError.default("key has not been generated yet");
        }
        // no metadata set, assumes new user
        await this._initializeNewKey({ initializeModules: true, importedKey: importKey, delete1OutOf1: p.delete1OutOf1 });
        return this.getKeyDetails();
      }
      // else we continue with catching up share and metadata
      shareStore = ShareStore.fromJSON(rawServiceProviderShare);
    } else {
      throw CoreError.default("Input is not supported");
    }

    // We determine the latest metadata on the SDK and if there has been
    // needed transtions to include
    let currentMetadata: Metadata;
    let latestCloudMetadata: Metadata;
    // we fetch the latest metadata for the account from the share
    let latestShareDetails: CatchupToLatestShareResult;
    try {
      latestShareDetails = await this.catchupToLatestShare({ shareStore });
    } catch (err) {
      // check if error is not the undefined error
      // if so we dont throw immedietly incase there is valid transition metadata
      const noMetadataExistsForShare = err.code === 1503;
      if (!noMetadataExistsForShare || !reinitializing) {
        throw err;
      }
    }

    // lets check if the cloud metadata has been updated or not from previously if we are reinitializing
    if (reinitializing && !reinitializingWithNewKeyAssign) {
      if (previouslyFetchedCloudMetadata.nonce < latestShareDetails.shareMetadata.nonce) {
        throw CoreError.fromCode(1104);
      } else if (previouslyFetchedCloudMetadata.nonce > latestShareDetails.shareMetadata.nonce) {
        throw CoreError.fromCode(1105);
      }
      latestCloudMetadata = previouslyFetchedCloudMetadata;
    } else {
      latestCloudMetadata = latestShareDetails ? latestShareDetails.shareMetadata.clone() : undefined;
    }

    // If we've been provided with transition metadata we use that as the current metadata instead
    // as we want to maintain state before and after serialization.
    // (Given that the checks for cloud metadata pass)
    if (reinitializing) {
      currentMetadata = transitionMetadata;
      this._localMetadataTransitions = previousLocalMetadataTransitions;
    } else {
      currentMetadata = latestShareDetails.shareMetadata;
    }

    this.lastFetchedCloudMetadata = latestCloudMetadata;
    this.metadata = currentMetadata;
    const latestShare = latestShareDetails ? latestShareDetails.latestShare : shareStore;
    this.inputShareStore(latestShare);

    // initialize modules
    await this.initializeModules();

    return this.getKeyDetails();
  }

  /**
   * catchupToLatestShare recursively loops fetches metadata of the provided share and checks if there is an encrypted share for it.
   * @param shareStore - share to start of with
   * @param polyID - if specified, polyID to refresh to if it exists
   */
  async catchupToLatestShare(params: {
    shareStore: ShareStore;
    polyID?: PolynomialID;
    includeLocalMetadataTransitions?: boolean;
  }): Promise<CatchupToLatestShareResult> {
    const { shareStore, polyID, includeLocalMetadataTransitions } = params;
    let shareMetadata: Metadata;
    try {
      shareMetadata = await this.getAuthMetadata({ privKey: shareStore.share.share, includeLocalMetadataTransitions });
    } catch (err) {
      throw CoreError.authMetadataGetUnavailable(`, ${prettyPrintError(err)}`);
    }

    try {
      // if matches specified polyID return it
      if (polyID) {
        if (shareStore.polynomialID === polyID) {
          return { latestShare: shareStore, shareMetadata };
        }
      }
      const nextShare = await shareMetadata.getEncryptedShare(shareStore);
      return await this.catchupToLatestShare({ shareStore: nextShare, polyID, includeLocalMetadataTransitions });
    } catch (err) {
      return { latestShare: shareStore, shareMetadata };
    }
  }

  async reconstructKey(_reconstructKeyMiddleware = true): Promise<ReconstructedKeyResult> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const requiredThreshold = pubPoly.getThreshold();
    const pubPolyID = pubPoly.getPolynomialID();

    // check if we have enough shares to meet threshold
    let sharesLeft = requiredThreshold;
    // we don't just check the latest poly but
    //  we check if the shares on previous polynomials in our stores have the share indexes we require
    const fullShareList = this.metadata.getShareIndexesForPolynomial(pubPolyID);
    const shareIndexesRequired = {};
    for (let i = 0; i < fullShareList.length; i += 1) {
      shareIndexesRequired[fullShareList[i]] = true;
    }
    const sharesToInput = [];
    for (let z = this.metadata.polyIDList.length - 1; z >= 0 && sharesLeft > 0; z -= 1) {
      const sharesForPoly = this.shares[this.metadata.polyIDList[z][0]];
      if (sharesForPoly) {
        const shareIndexesForPoly = Object.keys(sharesForPoly);
        for (let k = 0; k < shareIndexesForPoly.length && sharesLeft > 0; k += 1) {
          if (shareIndexesForPoly[k] in shareIndexesRequired) {
            const currentShareForPoly = sharesForPoly[shareIndexesForPoly[k]];
            if (currentShareForPoly.polynomialID === pubPolyID) {
              sharesToInput.push(currentShareForPoly);
            } else {
              const latestShareRes = await this.catchupToLatestShare({
                shareStore: currentShareForPoly,
                polyID: pubPolyID,
                includeLocalMetadataTransitions: true,
              });
              if (latestShareRes.latestShare.polynomialID === pubPolyID) {
                sharesToInput.push(latestShareRes.latestShare);
              } else {
                throw new CoreError(1304, "Share found in unexpected polynomial"); // Share found in unexpected polynomial
              }
            }
            delete shareIndexesRequired[shareIndexesForPoly[k]];
            sharesLeft -= 1;
          }
        }
      }
    }

    // Input shares to ensure atomicity
    sharesToInput.forEach((share) => {
      this.inputShareStore(share);
    });

    if (sharesLeft > 0) {
      throw CoreError.unableToReconstruct(` require ${requiredThreshold} but have ${requiredThreshold - sharesLeft}`);
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
      throw CoreError.incorrectReconstruction();
    }
    this._setKey(privKey);

    const returnObject = {
      privKey,
      allKeys: [privKey],
    };

    if (_reconstructKeyMiddleware && Object.keys(this._reconstructKeyMiddleware).length > 0) {
      // retireve/reconstruct extra keys that live on metadata
      await Promise.all(
        Object.keys(this._reconstructKeyMiddleware).map(async (x) => {
          if (Object.prototype.hasOwnProperty.call(this._reconstructKeyMiddleware, x)) {
            const extraKeys = await this._reconstructKeyMiddleware[x]();
            returnObject[x] = extraKeys;
            returnObject.allKeys.push(...extraKeys);
          }
        })
      );
    }
    return returnObject;
  }

  reconstructLatestPoly(): Polynomial {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const pubPolyID = pubPoly.getPolynomialID();
    const threshold = pubPoly.getThreshold();

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[pubPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw CoreError.unableToReconstruct("not enough shares to reconstruct poly");
    }
    if (new Set(sharesForExistingPoly).size !== sharesForExistingPoly.length) {
      throw CoreError.default("share indexes should be unique");
    }
    for (let i = 0; i < threshold; i += 1) {
      pointsArr.push(new Point(new BN(sharesForExistingPoly[i], "hex"), this.shares[pubPolyID][sharesForExistingPoly[i]].share.share));
    }
    return lagrangeInterpolatePolynomial(pointsArr);
  }

  async deleteShare(shareIndex: BNString): Promise<DeleteShareResult> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    if (!this.privKey) {
      throw CoreError.privateKeyUnavailable();
    }
    const shareIndexToDelete = new BN(shareIndex, "hex");
    const shareToDelete = this.outputShareStore(shareIndexToDelete);
    if (shareIndexToDelete.cmp(new BN("1", "hex")) === 0) {
      throw new CoreError(1001, "Unable to delete service provider share");
    }

    // Get existing shares
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const previousPolyID = pubPoly.getPolynomialID();
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);
    const newShareIndexes = [];
    existingShareIndexes.forEach((el) => {
      const bn = new BN(el, "hex");
      if (bn.cmp(shareIndexToDelete) !== 0) {
        newShareIndexes.push(bn.toString("hex"));
      }
    });

    // Update shares
    if (existingShareIndexes.length === newShareIndexes.length) {
      throw CoreError.default("Share index does not exist in latest polynomial");
    } else if (newShareIndexes.length < pubPoly.getThreshold()) {
      throw CoreError.default(`Minimum ${pubPoly.getThreshold()} shares are required for tkey. Unable to delete share`);
    }
    const results = await this._refreshShares(pubPoly.getThreshold(), [...newShareIndexes], previousPolyID);
    const newShareStores = results.shareStores;
    await this.addLocalMetadataTransitions({ input: [{ message: SHARE_DELETED, dateAdded: Date.now() }], privKey: [shareToDelete.share.share] });
    return { newShareStores };
  }

  async generateNewShare(): Promise<GenerateNewShareResult> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    if (!this.privKey) {
      throw CoreError.privateKeyUnavailable();
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const previousPolyID = pubPoly.getPolynomialID();
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);
    const existingShareIndexesBN = existingShareIndexes.map((el) => new BN(el, "hex"));
    const newShareIndex = new BN(generatePrivateExcludingIndexes(existingShareIndexesBN));

    const results = await this._refreshShares(pubPoly.getThreshold(), [...existingShareIndexes, newShareIndex.toString("hex")], previousPolyID);
    const newShareStores = results.shareStores;

    return { newShareStores, newShareIndex };
  }

  async _refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    if (!this.privKey) {
      throw CoreError.privateKeyUnavailable();
    }
    if (threshold > newShareIndexes.length) {
      throw CoreError.default(`threshold should not be greater than share indexes. ${threshold} > ${newShareIndexes.length}`);
    }

    // update metadata nonce
    this.metadata.nonce += 1;

    const poly = generateRandomPolynomial(threshold - 1, this.privKey);
    const shares = poly.generateShares(newShareIndexes);
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[previousPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw CoreError.unableToReconstruct("not enough shares for polynomial reconstruction");
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
      newShareStores[shareIndexHex] = new ShareStore(shares[shareIndexHex], polyID, this.tssClientShare);
    });

    // evaluate oldPoly for old shares and set new metadata with encrypted share for new polynomial

    const m = this.metadata.clone();
    const newScopedStore = {};
    const sharesToPush = await Promise.all(
      shareIndexesNeedingEncryption.map(async (shareIndex) => {
        const oldShare = oldPoly.polyEval(new BN(shareIndex, "hex"));
        const encryptedShare = await encrypt(getPubKeyECC(oldShare), Buffer.from(JSON.stringify(newShareStores[shareIndex])));
        newScopedStore[getPubKeyPoint(oldShare).x.toString("hex")] = encryptedShare;
        oldShareStores[shareIndex] = new ShareStore(new Share(shareIndex, oldShare), previousPolyID, this.tssClientShare);
        return oldShare;
      })
    );
    m.setScopedStore("encryptedShares", newScopedStore);
    const metadataToPush = Array(sharesToPush.length).fill(m);

    // run refreshShare middleware
    // If a shareIndex is left out during refresh shares, we assume that it being explicitly deleted.
    for (const moduleName in this._refreshMiddleware) {
      if (Object.prototype.hasOwnProperty.call(this._refreshMiddleware, moduleName)) {
        const adjustedGeneralStore = this._refreshMiddleware[moduleName](
          this.metadata.getGeneralStoreDomain(moduleName),
          oldShareStores,
          newShareStores
        );
        if (!adjustedGeneralStore) this.metadata.deleteGeneralStoreDomain(moduleName);
        else this.metadata.setGeneralStoreDomain(moduleName, adjustedGeneralStore);
      }
    }

    const newShareMetadataToPush = [];
    const newShareStoreSharesToPush = newShareIndexes.map((shareIndex) => {
      const me = this.metadata.clone();
      newShareMetadataToPush.push(me);
      return newShareStores[shareIndex].share.share;
    });

    const AuthMetadatas = this.generateAuthMetadata({ input: [...metadataToPush, ...newShareMetadataToPush] });

    // Combine Authmetadata and service provider ShareStore
    await this.addLocalMetadataTransitions({
      input: [...AuthMetadatas, newShareStores["1"]],
      privKey: [...sharesToPush, ...newShareStoreSharesToPush, undefined],
    });

    // update this.shares with these new shares
    for (let index = 0; index < newShareIndexes.length; index += 1) {
      const shareIndex = newShareIndexes[index];
      this.inputShareStore(newShareStores[shareIndex]);
    }
    // await this.releaseWriteMetadataLock();
    return { shareStores: newShareStores };
  }

  async _initializeNewKey({
    determinedShare,
    initializeModules,
    importedKey,
    delete1OutOf1,
    importedTSSShare
  }: {
    determinedShare?: BN;
    initializeModules?: boolean;
    importedKey?: BN;
    delete1OutOf1?: boolean;
    importedTSSShare?: BN;
  } = {}): Promise<InitializeNewKeyResult> {
    if (!importedKey) {
      const tmpPriv = generatePrivate();
      this._setKey(new BN(tmpPriv));
    } else {
      this._setKey(new BN(importedKey));
    }

    let tssShare: BN;
    if (!importedTSSShare) {
      const tmpPriv = generatePrivate();
      tssShare = new BN(tmpPriv);
    } else {
      tssShare = new BN(importedKey);
    }

    // create a random poly and respective shares
    // 1 is defined as the serviceProvider share
    // 0 is for tKey
    const shareIndexForDeviceStorage = generatePrivateExcludingIndexes([new BN(1), new BN(0)]);

    const shareIndexes = [new BN(1), shareIndexForDeviceStorage];
    let poly: Polynomial;
    if (determinedShare) {
      const shareIndexForDeterminedShare = generatePrivateExcludingIndexes([new BN(1), new BN(0)]);
      poly = generateRandomPolynomial(1, this.privKey, [new Share(shareIndexForDeterminedShare, determinedShare)]);
      shareIndexes.push(shareIndexForDeterminedShare);
    } else {
      poly = generateRandomPolynomial(1, this.privKey);
    }
    const shares = poly.generateShares(shareIndexes);

    // create our TSS key as well
    const nodeTSSpk = this.serviceProvider.getTSSPk();
    const tssPK = lagrangePublicPoints([new BN(1), new BN(2)], [nodeTSSpk, getPubKeyPoint(tssShare) ]);
    this._setTSSShare(new Share(new BN(2),tssShare));

    // create metadata to be stored
    const metadata = new Metadata(getPubKeyPoint(this.privKey));
    metadata.addFromPolynomialAndShares(poly, shares);
    const serviceProviderShare = shares[shareIndexes[0].toString("hex")];
    const shareStore = new ShareStore(serviceProviderShare, poly.getPolynomialID(), this.tssClientShare);
    this.metadata = metadata;

    // initialize modules
    if (initializeModules) {
      await this.initializeModules();
    }

    const metadataToPush = [];
    const sharesToPush = shareIndexes.map((shareIndex) => {
      metadataToPush.push(this.metadata);
      return shares[shareIndex.toString("hex")].share;
    });

    const authMetadatas = this.generateAuthMetadata({ input: metadataToPush });

    // because this is the first time we're setting metadata there is no need to acquire a lock
    // acquireLock: false. Force push
    await this.addLocalMetadataTransitions({ input: [...authMetadatas, shareStore], privKey: [...sharesToPush, undefined] });
    if (delete1OutOf1) {
      await this.addLocalMetadataTransitions({ input: [{ message: ONE_KEY_DELETE_NONCE }], privKey: [this.serviceProvider.postboxKey] });
    }

    // store metadata on metadata respective to shares
    for (let index = 0; index < shareIndexes.length; index += 1) {
      const shareIndex = shareIndexes[index];
      // also add into our share store
      this.inputShareStore(new ShareStore(shares[shareIndex.toString("hex")], poly.getPolynomialID(), this.tssClientShare));
    }

    if (this.storeDeviceShare) {
      await this.storeDeviceShare(new ShareStore(shares[shareIndexes[1].toString("hex")], poly.getPolynomialID(), this.tssClientShare));
    }

    const result = {
      privKey: this.privKey,
      deviceShare: new ShareStore(shares[shareIndexes[1].toString("hex")], poly.getPolynomialID(), this.tssClientShare),
      userShare: undefined,
    };
    if (determinedShare) {
      result.userShare = new ShareStore(shares[shareIndexes[2].toString("hex")], poly.getPolynomialID(), this.tssClientShare);
    }
    return result;
  }

  async addLocalMetadataTransitions(params: {
    input: LocalTransitionData;
    serviceProvider?: IServiceProvider;
    privKey?: Array<BN>;
    acquireLock?: boolean;
  }): Promise<void> {
    const { privKey, input } = params;
    this._localMetadataTransitions[0] = [...this._localMetadataTransitions[0], ...privKey];
    this._localMetadataTransitions[1] = [...this._localMetadataTransitions[1], ...input];
    if (!this.manualSync) await this.syncLocalMetadataTransitions();
  }

  async syncLocalMetadataTransitions(): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    if (!(Array.isArray(this._localMetadataTransitions[0]) && this._localMetadataTransitions[0].length > 0)) return;

    // get lock
    let acquiredLock = false;
    if (this.lastFetchedCloudMetadata) {
      await this.acquireWriteMetadataLock();
      acquiredLock = true;
    }
    try {
      await this.storageLayer.setMetadataStream({
        input: this._localMetadataTransitions[1],
        privKey: this._localMetadataTransitions[0],
        serviceProvider: this.serviceProvider,
      });
    } catch (error) {
      throw CoreError.metadataPostFailed(prettyPrintError(error));
    }

    this._localMetadataTransitions = [[], []];
    this.lastFetchedCloudMetadata = this.metadata.clone();
    // release lock
    if (acquiredLock) await this.releaseWriteMetadataLock();
  }

  // Returns a new instance of metadata with a clean state. All the previous state will be reset.
  async updateSDK(params?: { withShare?: ShareStore }): Promise<ThresholdKey> {
    const tb = new ThresholdKey({
      enableLogging: this.enableLogging,
      modules: this.modules,
      serviceProvider: this.serviceProvider,
      storageLayer: this.storageLayer,
      manualSync: this.manualSync,
    });

    try {
      await tb.initialize({ neverInitializeNewKey: true, withShare: params && params.withShare });
    } catch (err) {
      throw CoreError.fromCode(1103, `${err.message}`);
    }

    // Delete unnecessary polyIDs and shareStores
    const allPolyIDList = tb.metadata.polyIDList;
    let lastValidPolyID;

    Object.keys(this.shares).forEach((x) => {
      if (allPolyIDList.find((id) => id[0] === x)) {
        lastValidPolyID = x;
      } else {
        delete this.shares[x];
      }
    });

    // catchup to latest shareStore for all latest available shares.
    // TODO: fix edge cases where shares are deleted in the newer polynomials
    // TODO: maybe assign this.shares directly rather than output and inputsharestore.
    const shareStoresForLastValidPolyID = Object.keys(this.shares[lastValidPolyID]).map((x) =>
      tb.inputShareStoreSafe(this.outputShareStore(x, lastValidPolyID))
    );
    await Promise.all(shareStoresForLastValidPolyID);
    return tb;
  }

  inputShareStore(shareStore: ShareStore): void {
    let ss: ShareStore;
    if (shareStore instanceof ShareStore) {
      ss = shareStore;
    } else if (typeof shareStore === "object") {
      ss = ShareStore.fromJSON(shareStore);
    } else {
      throw CoreError.default("can only add type ShareStore into shares");
    }
    if (!(ss.polynomialID in this.shares)) {
      this.shares[ss.polynomialID] = {};
    }
    this.shares[ss.polynomialID][ss.share.shareIndex.toString("hex")] = ss;
  }

  // inputs a share ensuring that the share is the latest share AND metadata is updated to its latest state
  async inputShareStoreSafe(shareStore: ShareStore, autoUpdateMetadata = false): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    let ss: ShareStore;
    if (shareStore instanceof ShareStore) {
      ss = shareStore;
    } else if (typeof shareStore === "object") {
      ss = ShareStore.fromJSON(shareStore);
    } else {
      throw CoreError.default("can only add type ShareStore into shares");
    }
    const latestShareRes = await this.catchupToLatestShare({ shareStore: ss, includeLocalMetadataTransitions: true });
    // if not in poly id list, metadata is probably outdated
    // is !this.metadata.polyIDList.includes(latestShareRes.latestShare.polynomialID)
    if (!this.metadata.polyIDList.find((tuple) => tuple[0] === latestShareRes.latestShare.polynomialID)) {
      if (!autoUpdateMetadata)
        throw CoreError.default(
          `TKey SDK metadata seems to be outdated because shareIndex: ` +
            `${latestShareRes.latestShare.share.shareIndex.toString("hex")} has a more recent metadata. Please call updateSDK first`
        );
      else this.metadata = latestShareRes.shareMetadata;
    }
    if (!(latestShareRes.latestShare.polynomialID in this.shares)) {
      this.shares[latestShareRes.latestShare.polynomialID] = {};
    }
    this.shares[latestShareRes.latestShare.polynomialID][latestShareRes.latestShare.share.shareIndex.toString("hex")] = latestShareRes.latestShare;
  }

  outputShareStore(shareIndex: BNString, polyID?: string): ShareStore {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    let shareIndexParsed: BN;
    if (typeof shareIndex === "number") {
      shareIndexParsed = new BN(shareIndex);
    } else if (BN.isBN(shareIndex)) {
      shareIndexParsed = shareIndex;
    } else if (typeof shareIndex === "string") {
      shareIndexParsed = new BN(shareIndex, "hex");
    }
    let polyIDToSearch: string;
    if (polyID) {
      polyIDToSearch = polyID;
    } else {
      polyIDToSearch = this.metadata.getLatestPublicPolynomial().getPolynomialID();
    }
    if (!this.metadata.getShareIndexesForPolynomial(polyIDToSearch).includes(shareIndexParsed.toString("hex"))) {
      throw new CoreError(1002, "no such share index created");
    }
    const shareFromStore = this.shares[polyIDToSearch][shareIndexParsed.toString("hex")];
    if (shareFromStore) return shareFromStore;
    const poly = this.reconstructLatestPoly();
    const shareMap = poly.generateShares([shareIndexParsed]);

    return new ShareStore(shareMap[shareIndexParsed.toString("hex")], polyIDToSearch, this.tssClientShare);
  }

  _setKey(privKey: BN): void {
    this.privKey = privKey;
  }

  _setTSSShare(tssShare: Share): void {
    this.tssClientShare = tssShare;
  }

  getCurrentShareIndexes(): string[] {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const latestPolynomial = this.metadata.getLatestPublicPolynomial();
    const latestPolynomialId = latestPolynomial.getPolynomialID();
    const currentShareIndexes = Object.keys(this.shares[latestPolynomialId]);
    return currentShareIndexes;
  }

  getKeyDetails(): KeyDetails {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const poly = this.metadata.getLatestPublicPolynomial();
    const previousPolyID = poly.getPolynomialID();
    const requiredShares = poly.getThreshold() - Object.keys(this.shares[previousPolyID]).length;

    let shareDescriptions = this.metadata.getShareDescription();
    if (shareDescriptions) {
      const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(previousPolyID);
      shareDescriptions = Object.keys(shareDescriptions).reduce((acc, index) => {
        if (existingShareIndexes.indexOf(index) >= 0) acc[index] = shareDescriptions[index];
        return acc;
      }, {});
    }

    return {
      pubKey: this.metadata.pubKey,
      requiredShares,
      threshold: poly.getThreshold(),
      totalShares: this.metadata.getShareIndexesForPolynomial(previousPolyID).length,
      shareDescriptions,
    };
  }

  // Auth functions

  generateAuthMetadata(params: { input: Metadata[] }): AuthMetadata[] {
    const { input } = params;
    const authMetadatas = [];
    for (let i = 0; i < input.length; i += 1) {
      authMetadatas.push(new AuthMetadata(input[i], this.privKey));
    }
    return authMetadatas;
  }

  setAuthMetadata(params: { input: Metadata; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{
    message: string;
  }> {
    const { input, serviceProvider, privKey } = params;
    const authMetadata = new AuthMetadata(input, this.privKey);
    return this.storageLayer.setMetadata({ input: authMetadata, serviceProvider, privKey });
  }

  async setAuthMetadataBulk(params: { input: Metadata[]; serviceProvider?: IServiceProvider; privKey?: BN[] }): Promise<void> {
    if (!this.privKey) {
      throw CoreError.privateKeyUnavailable();
    }
    const { input, serviceProvider, privKey } = params;
    const authMetadatas = [] as AuthMetadata[];
    for (let i = 0; i < input.length; i += 1) {
      authMetadatas.push(new AuthMetadata(input[i], this.privKey));
    }
    await this.addLocalMetadataTransitions({ input: authMetadatas, serviceProvider, privKey });
  }

  async getAuthMetadata(params: { serviceProvider?: IServiceProvider; privKey?: BN; includeLocalMetadataTransitions?: boolean }): Promise<Metadata> {
    const raw = await this.getGenericMetadataWithTransitionStates({ ...params, fromJSONConstructor: AuthMetadata });
    const authMetadata = raw as AuthMetadata;
    return authMetadata.metadata;
  }

  // fetches the latest metadata potentially searching in local transition states first
  async getGenericMetadataWithTransitionStates(params: {
    fromJSONConstructor: FromJSONConstructor;
    serviceProvider?: IServiceProvider;
    privKey?: BN;
    includeLocalMetadataTransitions?: boolean;
    _localMetadataTransitions?: LocalMetadataTransitions;
  }): Promise<unknown> {
    if (!((params.serviceProvider && params.serviceProvider.postboxKey.toString("hex") !== "0") || params.privKey)) {
      throw CoreError.default("require either serviceProvider or priv key in getGenericMetadataWithTransitionStates");
    }
    if (params.includeLocalMetadataTransitions) {
      const transitions: LocalMetadataTransitions = params._localMetadataTransitions
        ? params._localMetadataTransitions
        : this._localMetadataTransitions;
      let index = null;
      for (let i = transitions[0].length - 1; i >= 0; i -= 1) {
        const x = transitions[0][i];
        if (params.privKey && x && x.cmp(params.privKey) === 0) index = i;
        else if (params.serviceProvider && !x) index = i;
      }
      if (index !== null) {
        return transitions[1][index];
      }
    }
    let raw: IMessageMetadata;
    try {
      raw = await this.storageLayer.getMetadata(params);
    } catch (err) {
      throw CoreError.metadataGetFailed(`${prettyPrintError(err)}`);
    }
    if ((raw as IMessageMetadata).message === SHARE_DELETED) {
      throw CoreError.fromCode(1308);
    }
    return params.fromJSONConstructor.fromJSON(raw);
  }

  // Lock functions
  async acquireWriteMetadataLock(): Promise<number> {
    if (this.haveWriteMetadataLock) return this.metadata.nonce;
    if (!this.privKey) {
      throw CoreError.privateKeyUnavailable();
    }

    // we check the metadata of a random share we have on the latest polynomial we know that reflects the cloud
    // below we cater for if we have an existing share or need to create the share in the SDK
    let randomShareStore: ShareStore;
    const latestPolyIDOnCloud = this.lastFetchedCloudMetadata.getLatestPublicPolynomial().getPolynomialID();
    const shareIndexesExistInSDK = Object.keys(this.shares[latestPolyIDOnCloud]);
    const randomIndex = shareIndexesExistInSDK[Math.floor(Math.random() * (shareIndexesExistInSDK.length - 1))];
    if (shareIndexesExistInSDK.length >= 1) {
      randomShareStore = this.shares[latestPolyIDOnCloud][randomIndex];
    } else {
      randomShareStore = this.outputShareStore(randomIndex, latestPolyIDOnCloud);
    }
    const latestRes = await this.catchupToLatestShare({ shareStore: randomShareStore });
    const latestMetadata = latestRes.shareMetadata;

    // read errors for what each means
    if (latestMetadata.nonce > this.lastFetchedCloudMetadata.nonce) {
      throw CoreError.acquireLockFailed(`unable to acquire write access for metadata due to 
      lastFetchedCloudMetadata (${this.lastFetchedCloudMetadata.nonce})
           being lower than last written metadata nonce (${latestMetadata.nonce}). perhaps update metadata SDK (create new tKey and init)`);
    } else if (latestMetadata.nonce < this.lastFetchedCloudMetadata.nonce) {
      throw CoreError.acquireLockFailed(`unable to acquire write access for metadata due to 
      lastFetchedCloudMetadata (${this.lastFetchedCloudMetadata.nonce})
      being higher than last written metadata nonce (${latestMetadata.nonce}). this should never happen as it 
      should only ever be updated by getting metadata)`);
    }

    const res = await this.storageLayer.acquireWriteLock({ privKey: this.privKey });
    if (res.status !== 1) throw CoreError.acquireLockFailed(`lock cannot be acquired from storage layer status code: ${res.status}`);

    // increment metadata nonce for write session
    // this.metadata.nonce += 1;
    this.haveWriteMetadataLock = res.id;
    return this.metadata.nonce;
  }

  async releaseWriteMetadataLock(): Promise<void> {
    if (!this.haveWriteMetadataLock) throw CoreError.releaseLockFailed("releaseWriteMetadataLock - don't have metadata lock to release");
    const res = await this.storageLayer.releaseWriteLock({ privKey: this.privKey, id: this.haveWriteMetadataLock });
    if (res.status !== 1) throw CoreError.releaseLockFailed(`lock cannot be released from storage layer status code: ${res.status}`);
    this.haveWriteMetadataLock = "";
  }

  // Module functions

  async _syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const pubPolyID = pubPoly.getPolynomialID();
    const existingShareIndexes = this.metadata.getShareIndexesForPolynomial(pubPolyID);
    const threshold = pubPoly.getThreshold();

    const pointsArr = [];
    const sharesForExistingPoly = Object.keys(this.shares[pubPolyID]);
    if (sharesForExistingPoly.length < threshold) {
      throw CoreError.unableToReconstruct("not enough shares for polynomial reconstruction");
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
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    this.metadata.nonce += 1;

    const newMetadataPromise = shares.map(async (share) => {
      const newMetadata = this.metadata.clone();
      let specificShareMetadata: Metadata;
      try {
        specificShareMetadata = await this.getAuthMetadata({ privKey: share, includeLocalMetadataTransitions: true });
      } catch (err) {
        throw CoreError.authMetadataGetUnavailable(`${prettyPrintError(err)}`);
      }

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
    return this.setAuthMetadataBulk({ input: newMetadata, privKey: shares });
  }

  _addRefreshMiddleware(
    moduleName: string,
    middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown
  ): void {
    this._refreshMiddleware[moduleName] = middleware;
  }

  _addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void {
    this._reconstructKeyMiddleware[moduleName] = middleware;
  }

  _addShareSerializationMiddleware(
    serialize: (share: BN, type: string) => Promise<unknown>,
    deserialize: (serializedShare: unknown, type: string) => Promise<BN>
  ): void {
    this._shareSerializationMiddleware = {
      serialize,
      deserialize,
    };
  }

  _setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void {
    if (this.storeDeviceShare) {
      throw CoreError.default("storeDeviceShare already set");
    }
    this.storeDeviceShare = storeDeviceStorage;
  }

  async addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    this.metadata.addShareDescription(shareIndex, description);
    if (updateMetadata) {
      await this._syncShareMetadata();
    }
  }

  async deleteShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    this.metadata.deleteShareDescription(shareIndex, description);
    if (updateMetadata) {
      await this._syncShareMetadata();
    }
  }

  async updateShareDescription(shareIndex: string, oldDescription: string, newDescription: string, updateMetadata?: boolean): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    this.metadata.updateShareDescription(shareIndex, oldDescription, newDescription);
    if (updateMetadata) {
      await this._syncShareMetadata();
    }
  }

  async encrypt(data: Buffer): Promise<EncryptedMessage> {
    if (!this.privKey) throw CoreError.privateKeyUnavailable();
    return encrypt(getPubKeyECC(this.privKey), data);
  }

  async decrypt(encryptedMessage: EncryptedMessage): Promise<Buffer> {
    if (!this.privKey) throw CoreError.privateKeyUnavailable();
    return decrypt(toPrivKeyECC(this.privKey), encryptedMessage);
  }

  async _setTKeyStoreItem(moduleName: string, data: TkeyStoreItemType): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const rawTkeyStoreItems: EncryptedMessage[] = (this.metadata.getTkeyStoreDomain(moduleName) as EncryptedMessage[]) || [];
    const decryptedItems = await Promise.all(
      rawTkeyStoreItems.map(async (x) => {
        const decryptedItem = await this.decrypt(x);
        return JSON.parse(decryptedItem.toString()) as TkeyStoreItemType;
      })
    );
    const encryptedData = await this.encrypt(Buffer.from(stringify(data)));
    const duplicateItemIndex = decryptedItems.findIndex((x) => x.id === data.id);
    if (duplicateItemIndex > -1) {
      rawTkeyStoreItems[duplicateItemIndex] = encryptedData;
    } else {
      rawTkeyStoreItems.push(encryptedData);
    }

    // update metadataStore
    this.metadata.setTkeyStoreDomain(moduleName, rawTkeyStoreItems);
    await this._syncShareMetadata();
  }

  async _deleteTKeyStoreItem(moduleName: string, id: string): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const rawTkeyStoreItems = (this.metadata.getTkeyStoreDomain(moduleName) as EncryptedMessage[]) || [];
    const decryptedItems = await Promise.all(
      rawTkeyStoreItems.map(async (x) => {
        const decryptedItem = await this.decrypt(x);
        return JSON.parse(decryptedItem.toString()) as TkeyStoreItemType;
      })
    );
    const finalItems = decryptedItems.filter((x) => x.id !== id);
    this.metadata.setTkeyStoreDomain(moduleName, finalItems);
    await this._syncShareMetadata();
  }

  async getTKeyStore(moduleName: string): Promise<TkeyStoreItemType[]> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const rawTkeyStoreItems = (this.metadata.getTkeyStoreDomain(moduleName) as EncryptedMessage[]) || [];

    const decryptedItems = await Promise.all(
      rawTkeyStoreItems.map(async (x) => {
        const decryptedItem = await this.decrypt(x);
        return JSON.parse(decryptedItem.toString()) as TkeyStoreItemType;
      })
    );
    return decryptedItems;
  }

  async getTKeyStoreItem(moduleName: string, id: string): Promise<TkeyStoreItemType> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const rawTkeyStoreItems = (this.metadata.getTkeyStoreDomain(moduleName) as EncryptedMessage[]) || [];

    const decryptedItems = await Promise.all(
      rawTkeyStoreItems.map(async (x) => {
        const decryptedItem = await this.decrypt(x);
        return JSON.parse(decryptedItem.toString()) as TkeyStoreItemType;
      })
    );
    const item = decryptedItems.find((x) => x.id === id);
    return item;
  }

  // Import export shares
  async outputShare(shareIndex: BNString, type?: string): Promise<unknown> {
    const { share } = this.outputShareStore(shareIndex).share;
    if (!type) return share;

    return this._shareSerializationMiddleware.serialize(share, type);
  }

  async inputShare(share: unknown, tssShare:unknown, type?: string): Promise<void> {
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    let shareStore: ShareStore;
    if (!type) shareStore = this.metadata.shareToShareStore(share as BN, tssShare as BN);
    else {
      const deserialized = await this._shareSerializationMiddleware.deserialize(share, type);
      shareStore = this.metadata.shareToShareStore(deserialized, tssShare as BN);
    }
    const pubPoly = this.metadata.getLatestPublicPolynomial();
    const pubPolyID = pubPoly.getPolynomialID();
    const fullShareIndexesList = this.metadata.getShareIndexesForPolynomial(pubPolyID);
    if (!fullShareIndexesList.includes(shareStore.share.shareIndex.toString("hex"))) {
      throw CoreError.default("Latest poly doesn't include this share");
    }
    await this.inputShareStoreSafe(shareStore);
  }

  toJSON(): StringifiedType {
    return {
      shares: this.shares,
      enableLogging: this.enableLogging,
      privKey: this.privKey ? this.privKey.toString("hex") : undefined,
      metadata: this.metadata,
      lastFetchedCloudMetadata: this.lastFetchedCloudMetadata,
      _localMetadataTransitions: this._localMetadataTransitions,
      manualSync: this.manualSync,
      serviceProvider: this.serviceProvider,
      storageLayer: this.storageLayer,
    };
  }

  getApi(): ITKeyApi {
    return {
      getMetadata: this.getMetadata.bind(this),
      getStorageLayer: this.getStorageLayer.bind(this),
      initialize: this.initialize.bind(this),
      catchupToLatestShare: this.catchupToLatestShare.bind(this),
      _syncShareMetadata: this._syncShareMetadata.bind(this),
      _addRefreshMiddleware: this._addRefreshMiddleware.bind(this),
      _addReconstructKeyMiddleware: this._addReconstructKeyMiddleware.bind(this),
      _addShareSerializationMiddleware: this._addShareSerializationMiddleware.bind(this),
      addShareDescription: this.addShareDescription.bind(this),
      generateNewShare: this.generateNewShare.bind(this),
      inputShareStore: this.inputShareStore.bind(this),
      inputShareStoreSafe: this.inputShareStoreSafe.bind(this),
      outputShareStore: this.outputShareStore.bind(this),
      inputShare: this.inputShare.bind(this),
      outputShare: this.outputShare.bind(this),
      _setDeviceStorage: this._setDeviceStorage.bind(this),
      encrypt: this.encrypt.bind(this),
      decrypt: this.decrypt.bind(this),
      getTKeyStore: this.getTKeyStore.bind(this),
      getTKeyStoreItem: this.getTKeyStoreItem.bind(this),
      _setTKeyStoreItem: this._setTKeyStoreItem.bind(this),
      _deleteTKeyStoreItem: this._deleteTKeyStoreItem.bind(this),
      deleteShare: this.deleteShare.bind(this),
    };
  }

  private setModuleReferences() {
    Object.keys(this.modules).map((x) => this.modules[x].setModuleReferences(this.getApi()));
  }

  private async initializeModules() {
    return Promise.all(Object.keys(this.modules).map((x) => this.modules[x].initialize()));
  }
}

export default ThresholdKey;
