import {
  decrypt,
  encrypt,
  EncryptedMessage,
  FACTOR_KEY_TYPE,
  KeyDetails,
  KeyType,
  keyTypeToCurve,
  LocalMetadataTransitions,
  Point,
  ReconstructedKeyResult,
  ShareStore,
  TKeyArgs,
} from "@tkey/common-types";
import ThresholdKey, { CoreError, Metadata } from "@tkey/core";
import { dotProduct, ecPoint, hexPoint, PointHex, randomSelection, RSSClient } from "@toruslabs/rss-client";
import { getEd25519ExtendedPublicKey, getSecpKeyFromEd25519 } from "@toruslabs/torus.js";
import BN from "bn.js";
import { ec as EC } from "elliptic";
import { keccak256 } from "ethereum-cryptography/keccak";

import { TSSTorusServiceProvider } from ".";
import { FactorEnc, IAccountSaltStore, InitializeNewTSSKeyResult } from "./common";
import {
  BasePoint,
  generateSalt,
  getEd25519SeedStoreDomainKey,
  getLagrangeCoeffs,
  getPubKeyPoint,
  kCombinations,
  lagrangeInterpolation,
  pointToElliptic,
  pointToHex,
} from "./util";

export const TSS_MODULE = "tssModule";
export const TSS_TAG_DEFAULT = "default";

export interface TSSTKeyArgs extends TKeyArgs {
  serviceProvider: TSSTorusServiceProvider;
  tssKeyType?: KeyType;
  tssTag?: string;
}

export interface TKeyInitArgs {
  withShare?: ShareStore;
  importKey?: Buffer;
  neverInitializeNewKey?: boolean;
  transitionMetadata?: Metadata;
  previouslyFetchedCloudMetadata?: Metadata;
  previousLocalMetadataTransitions?: LocalMetadataTransitions;
  delete1OutOf1?: boolean;
}

export interface TKeyTSSInitArgs extends TKeyInitArgs {
  deviceTSSShare?: BN;
  deviceTSSIndex?: number;
  factorPub?: Point;
  skipTssInit?: boolean;
}

export class TKeyTSS extends ThresholdKey {
  serviceProvider: TSSTorusServiceProvider = null;

  private _tssCurve: EC;

  private _tssTag: string;

  private _accountSalt: string;

  /**
   * Constructs a new TKeyTSS instance. If `tssKeyType` is not provided, it
   * defaults to the value of `keyType`.
   */
  constructor(args: TSSTKeyArgs) {
    super(args);
    const { serviceProvider, storageLayer, tssTag = "default", keyType } = args;

    if (serviceProvider.keyType !== keyType) {
      throw CoreError.default(`service provider keyType mismatch: ${serviceProvider.keyType} !== ${keyType}`);
    }

    this.serviceProvider = serviceProvider;
    this.storageLayer = storageLayer;
    this._tssTag = tssTag;
    this.keyType = keyType;
    this._tssCurve = new EC(keyType);
  }

  public get tssTag(): string {
    return this._tssTag;
  }

  public set tssTag(tag: string) {
    this._tssTag = tag;
  }

  /**
   * Initializes this instance. If a TSS account does not exist, creates one
   * under the given factor key. `skipTssInit` skips TSS account creation and
   * can be used with `importTssKey` to just import an existing account instead.
   * @returns The key details of TKey core.
   */
  async initialize(params?: TKeyTSSInitArgs): Promise<KeyDetails> {
    const keyDetails = await super.initialize(params);

    if (!this.metadata.tssPolyCommits[this.tssTag] && !params?.skipTssInit) {
      // if tss shares have not been created for this tssTag, create new tss sharing
      const { factorEncs, factorPubs, tssPolyCommits } = await this._initializeNewTSSKey(
        this.tssTag,
        params.deviceTSSShare,
        params.factorPub,
        params.deviceTSSIndex
      );
      this.metadata.addTSSData({ keyType: this.keyType, tssTag: this.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
      const accountSalt = generateSalt(this._tssCurve);
      await this._setTKeyStoreItem(TSS_MODULE, {
        id: "accountSalt",
        value: accountSalt,
      } as IAccountSaltStore);
      this._accountSalt = accountSalt;
    }

    return keyDetails;
  }

  /**
   * Returns the encrypted data associated with the given factor public key.
   */
  getFactorEncs(factorPub: Point): FactorEnc {
    if (!this.metadata) throw CoreError.metadataUndefined();
    if (!this.metadata.factorEncs) throw CoreError.default("no factor encs mapping");
    if (!this.metadata.factorPubs) throw CoreError.default("no factor pubs mapping");
    const factorPubs = this.metadata.factorPubs[this.tssTag];
    if (!factorPubs) throw CoreError.default(`no factor pubs for this tssTag ${this.tssTag}`);
    if (factorPubs.filter((f) => f.x.cmp(factorPub.x) === 0 && f.y.cmp(factorPub.y) === 0).length === 0)
      throw CoreError.default(`factor pub ${factorPub} not found for tssTag ${this.tssTag}`);
    if (!this.metadata.factorEncs[this.tssTag]) throw CoreError.default(`no factor encs for tssTag ${this.tssTag}`);
    const factorPubID = factorPub.x.toString(16, 64);
    return this.metadata.factorEncs[this.tssTag][factorPubID];
  }

  /**
   * Returns the TSS share associated with the given factor private key.
   */
  async getTSSShare(
    factorKey: BN,
    opts?: {
      threshold?: number;
      accountIndex?: number;
      coefficient?: BN;
    }
  ): Promise<{
    tssIndex: number;
    tssShare: BN;
  }> {
    if (!this.privKey) throw CoreError.default("tss share cannot be returned until you've reconstructed tkey");
    const factorPub = getPubKeyPoint(factorKey, FACTOR_KEY_TYPE);
    const factorEncs = this.getFactorEncs(factorPub);
    const { userEnc, serverEncs, tssIndex, type } = factorEncs;
    const userDecryption = await decrypt(Buffer.from(factorKey.toString(16, 64), "hex"), userEnc);
    const serverDecryptions = await Promise.all(
      serverEncs.map((factorEnc) => {
        if (factorEnc === null) return null;
        return decrypt(Buffer.from(factorKey.toString(16, 64), "hex"), factorEnc);
      })
    );
    const tssShareBufs = [userDecryption].concat(serverDecryptions);

    const tssShareBNs = tssShareBufs.map((buf) => {
      if (buf === null) return null;
      return new BN(buf);
    });

    const ec = this._tssCurve;
    const tssCommits = this.getTSSCommits().map((p) => {
      return ec.keyFromPublic({ x: p.x.toString(16, 64), y: p.y.toString(16, 64) }).getPublic();
    });

    const userDec = tssShareBNs[0];

    const accountIndex = opts?.accountIndex || 0;
    const coefficient = opts?.coefficient || new BN(1);
    if (type === "direct") {
      const tssSharePub = ec.g.mul(userDec);
      const tssCommitA0 = tssCommits[0];
      const tssCommitA1 = tssCommits[1];
      const _tssSharePub = tssCommitA0.add(tssCommitA1.mul(new BN(tssIndex)));
      if (tssSharePub.eq(_tssSharePub)) {
        const adjustedShare = this.adjustTssShare(userDec, accountIndex, coefficient);
        return { tssIndex, tssShare: adjustedShare };
      }
      throw new Error("user decryption does not match tss commitments...");
    }

    // if type === "hierarchical"
    const serverDecs = tssShareBNs.slice(1); // 5 elems
    const serverIndexes = new Array(serverDecs.length).fill(null).map((_, i) => i + 1);

    const threshold = opts?.threshold || Math.ceil(serverDecs.length / 2);
    const combis = kCombinations(serverDecs.length, threshold);
    for (let i = 0; i < combis.length; i++) {
      const combi = combis[i];
      const selectedServerDecs = serverDecs.filter((_, j) => combi.indexOf(j) > -1);
      if (selectedServerDecs.includes(null)) continue;

      const selectedServerIndexes = serverIndexes.filter((_, j) => combi.indexOf(j) > -1);
      const serverLagrangeCoeffs = selectedServerIndexes.map((x) => getLagrangeCoeffs(ec, selectedServerIndexes, x));
      const serverInterpolated = dotProduct(serverLagrangeCoeffs, selectedServerDecs, ec.n);
      const lagrangeCoeffs = [getLagrangeCoeffs(ec, [1, 99], 1), getLagrangeCoeffs(ec, [1, 99], 99)];
      const tssShare = dotProduct(lagrangeCoeffs, [serverInterpolated, userDec], ec.n);
      const tssSharePub = ec.g.mul(tssShare);
      const tssCommitA0 = tssCommits[0];
      const tssCommitA1 = tssCommits[1];
      let _tssSharePub = tssCommitA0;
      for (let j = 0; j < tssIndex; j++) {
        _tssSharePub = _tssSharePub.add(tssCommitA1);
      }
      if (tssSharePub.eq(_tssSharePub)) {
        const adjustedShare = this.adjustTssShare(tssShare, accountIndex, coefficient);
        return { tssIndex, tssShare: adjustedShare };
      }
    }
    throw new Error("could not find any combination of server decryptions that match tss commitments...");
  }

  /**
   * Returns the TSS public key and the curve points corresponding to secret key
   * shares, as stored in Metadata.
   */
  getTSSCommits(): Point[] {
    if (!this.privKey) throw CoreError.default("tss pub cannot be returned until you've reconstructed tkey");
    if (!this.metadata) throw CoreError.metadataUndefined();
    const tssPolyCommits = this.metadata.tssPolyCommits[this.tssTag];
    if (!tssPolyCommits) throw CoreError.default(`tss poly commits not found for tssTag ${this.tssTag}`);
    if (tssPolyCommits.length === 0) throw CoreError.default("tss poly commits is empty");
    return tssPolyCommits;
  }

  /**
   * Returns the TSS public key.
   */
  getTSSPub(accountIndex?: number): Point {
    const ec = this._tssCurve;
    const tssCommits = this.getTSSCommits();
    if (accountIndex && accountIndex > 0) {
      const nonce = this.computeAccountNonce(accountIndex);
      // we need to add the pub key nonce to the tssPub
      const noncePub = ec.keyFromPrivate(nonce.toString("hex")).getPublic();
      const pubKeyPoint = pointToElliptic(ec, tssCommits[0]);
      const devicePubKeyPoint = pubKeyPoint.add(noncePub);
      return Point.fromSEC1(devicePubKeyPoint.encodeCompressed("hex"), this.keyType);
    }
    return tssCommits[0];
  }

  /**
   * Returns the node details for RSS.
   */
  async _getRssNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }> {
    const { serverEndpoints, serverPubKeys, serverThreshold } = await this.serviceProvider.getRSSNodeDetails();
    if (!Array.isArray(serverEndpoints) || serverEndpoints.length === 0) throw new Error("service provider tss server endpoints are missing");
    if (!Array.isArray(serverPubKeys) || serverPubKeys.length === 0) throw new Error("service provider pub keys are missing");
    return {
      serverEndpoints,
      serverPubKeys,
      serverThreshold: serverThreshold || Math.floor(serverEndpoints.length / 2) + 1,
    };
  }

  /**
   * Imports an existing key and makes it available for TSS under the specific
   * factor key.
   */
  async importTssKey(
    params: {
      tag: string;
      importKey: Buffer;
      factorPub: Point;
      newTSSIndex: number;
    },
    serverOpts: {
      selectedServers?: number[];
      authSignatures: string[];
    }
  ): Promise<void> {
    const ec = this._tssCurve;
    if (!this.privKey) throw CoreError.privateKeyUnavailable();
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const { importKey, factorPub, newTSSIndex, tag } = params;

    const oldTag = this.tssTag;
    this._tssTag = tag;

    try {
      const { selectedServers = [], authSignatures = [] } = serverOpts || {};

      if (!tag) throw CoreError.default(`invalid param, tag is required`);
      if (!factorPub) throw CoreError.default(`invalid param, newFactorPub is required`);
      if (!newTSSIndex) throw CoreError.default(`invalid param, newTSSIndex is required`);
      if (authSignatures.length === 0) throw CoreError.default(`invalid param, authSignatures is required`);

      const existingFactorPubs = this.metadata.factorPubs[tag];
      if (existingFactorPubs?.length > 0) {
        throw CoreError.default(`Duplicate account tag, please use a unique tag for importing key`);
      }
      const factorPubs = [factorPub];

      const importScalar = await (async () => {
        if (this.keyType === KeyType.secp256k1) {
          return new BN(importKey);
        } else if (this.keyType === KeyType.ed25519) {
          // Store seed in metadata.
          const domainKey = getEd25519SeedStoreDomainKey(this.tssTag || TSS_TAG_DEFAULT);
          const result = this.metadata.getGeneralStoreDomain(domainKey) as Record<string, unknown>;
          if (result) {
            throw new Error("Seed already exists");
          }

          const { scalar } = getEd25519ExtendedPublicKey(importKey);
          const encKey = Buffer.from(getSecpKeyFromEd25519(scalar).point.encodeCompressed("hex"), "hex");
          const msg = await encrypt(encKey, importKey);
          this.metadata.setGeneralStoreDomain(domainKey, { message: msg });

          return scalar;
        }
        throw new Error("Invalid key type");
      })();

      if (!importScalar || importScalar.eq(new BN("0"))) {
        throw new Error("Invalid importedKey");
      }

      const tssIndexes = [newTSSIndex];
      const existingNonce = this.metadata.tssNonces[this.tssTag];
      const newTssNonce: number = existingNonce && existingNonce > 0 ? existingNonce + 1 : 0;
      const verifierAndVerifierID = this.serviceProvider.getVerifierNameVerifierId();
      const label = `${verifierAndVerifierID}\u0015${this.tssTag}\u0016${newTssNonce}`;
      const tssPubKey = hexPoint(ec.g.mul(importScalar));
      const rssNodeDetails = await this._getRssNodeDetails();
      const { pubKey: newTSSServerPub, nodeIndexes } = await this.serviceProvider.getTSSPubKey(this.tssTag, newTssNonce);
      let finalSelectedServers = selectedServers;

      if (nodeIndexes?.length > 0) {
        if (selectedServers.length) {
          finalSelectedServers = nodeIndexes.slice(0, Math.min(selectedServers.length, nodeIndexes.length));
        } else {
          finalSelectedServers = nodeIndexes.slice(0, 3);
        }
      } else if (selectedServers?.length === 0) {
        finalSelectedServers = randomSelection(
          new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
          Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
        );
      }

      const { serverEndpoints, serverPubKeys, serverThreshold } = rssNodeDetails;

      const rssClient = new RSSClient({
        serverEndpoints,
        serverPubKeys,
        serverThreshold,
        tssPubKey,
        keyType: this.keyType,
      });

      const refreshResponses = await rssClient.import({
        importKey: importScalar,
        dkgNewPub: pointToHex(newTSSServerPub),
        selectedServers: finalSelectedServers,
        factorPubs: factorPubs.map((f) => pointToHex(f)),
        targetIndexes: tssIndexes,
        newLabel: label,
        sigs: authSignatures,
      });
      const secondCommit = pointToElliptic(ec, newTSSServerPub).add(ecPoint(ec, tssPubKey).neg());
      const newTSSCommits = [
        Point.fromJSON(tssPubKey),
        Point.fromJSON({ x: secondCommit.getX().toString(16, 64), y: secondCommit.getY().toString(16, 64) }),
      ];
      const factorEncs: {
        [factorPubID: string]: FactorEnc;
      } = {};
      for (let i = 0; i < refreshResponses.length; i++) {
        const refreshResponse = refreshResponses[i];
        factorEncs[refreshResponse.factorPub.x.padStart(64, "0")] = {
          type: "hierarchical",
          tssIndex: refreshResponse.targetIndex,
          userEnc: refreshResponse.userFactorEnc,
          serverEncs: refreshResponse.serverFactorEncs,
        };
      }
      this.metadata.addTSSData({
        tssTag: this.tssTag,
        tssNonce: newTssNonce,
        tssPolyCommits: newTSSCommits,
        factorPubs,
        factorEncs,
        keyType: this.keyType,
      });
      if (!this._accountSalt) {
        const accountSalt = generateSalt(this._tssCurve);
        await this._setTKeyStoreItem(TSS_MODULE, {
          id: "accountSalt",
          value: accountSalt,
        } as IAccountSaltStore);
        this._accountSalt = accountSalt;
      }
      await this._syncShareMetadata();
    } catch (error) {
      this._tssTag = oldTag;
      throw error;
    }
  }

  /**
   * UNSAFE: USE WITH CAUTION
   *
   * Reconstructs and exports the TSS private key.
   */
  async _UNSAFE_exportTssKey(tssOptions: { factorKey: BN; selectedServers?: number[]; authSignatures: string[] }): Promise<BN> {
    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.privKey) throw new Error("Tkey is not reconstructed");
    if (!this.metadata.tssPolyCommits[this.tssTag]) throw new Error(`tss key has not been initialized for tssTag ${this.tssTag}`);

    const { factorKey, selectedServers, authSignatures } = tssOptions;

    const { tssIndex } = await this.getTSSShare(factorKey);
    // Assumption that there are only index 2 and 3 for tss shares
    // create complement index share
    const tempShareIndex = tssIndex === 2 ? 3 : 2;
    const ecFactorKey = keyTypeToCurve(FACTOR_KEY_TYPE);
    const tempFactorKey = ecFactorKey.genKeyPair().getPrivate();
    const tempFactorPub = getPubKeyPoint(tempFactorKey, FACTOR_KEY_TYPE);

    await this.addFactorPub({
      existingFactorKey: factorKey,
      newFactorPub: tempFactorPub,
      newTSSIndex: tempShareIndex,
      authSignatures,
      selectedServers,
    });

    const { tssShare: factorShare, tssIndex: factorIndex } = await this.getTSSShare(factorKey);
    const { tssShare: tempShare, tssIndex: tempIndex } = await this.getTSSShare(tempFactorKey);

    // reconstruct final key using sss
    const ec = this._tssCurve;
    const finalKey = lagrangeInterpolation(ec, [tempShare, factorShare], [new BN(tempIndex), new BN(factorIndex)]);

    // deleted created tss share
    await this.deleteFactorPub({
      factorKey,
      deleteFactorPub: tempFactorPub,
      authSignatures,
      selectedServers,
    });

    return finalKey;
  }

  /**
   * UNSAFE: USE WITH CAUTION
   *
   * Reconstructs the TSS private key and exports the ed25519 private key seed.
   */
  async _UNSAFE_exportTssEd25519Seed(tssOptions: { factorKey: BN; selectedServers: number[]; authSignatures: string[] }): Promise<Buffer> {
    const edScalar = await this._UNSAFE_exportTssKey(tssOptions);

    // Try to export ed25519 seed. This is only available if import key was being used.
    const domainKey = getEd25519SeedStoreDomainKey(this.tssTag || TSS_TAG_DEFAULT);
    const result = this.metadata.getGeneralStoreDomain(domainKey) as Record<string, EncryptedMessage>;

    const decKey = getSecpKeyFromEd25519(edScalar).scalar;

    const seed = await decrypt(decKey.toBuffer("be", 32), result.message);
    return seed;
  }

  /**
   * Runs the share refresh protocol for the TSS key shares.
   * @param inputShare - The current user secret share.
   * @param inputIndex - The user share index.
   * @param factorPubs - The target factor keys.
   * @param targetIndexes - The target indices to provide new shares for.
   */
  async _refreshTSSShares(
    updateMetadata: boolean,
    inputShare: BN,
    inputIndex: number,
    factorPubs: Point[],
    targetIndexes: number[],
    verifierNameVerifierId: string,
    serverOpts: {
      serverEndpoints: string[];
      serverPubKeys: PointHex[];
      serverThreshold: number;
      selectedServers: number[];
      authSignatures: string[];
    }
  ): Promise<void> {
    if (!this.metadata) throw CoreError.metadataUndefined();
    if (!this.metadata.tssPolyCommits) throw CoreError.default(`tss poly commits obj not found`);
    const tssCommits = this.metadata.tssPolyCommits[this.tssTag];
    if (!tssCommits) throw CoreError.default(`tss commits not found for tssTag ${this.tssTag}`);
    if (tssCommits.length === 0) throw CoreError.default(`tssCommits is empty`);
    const tssPubKeyPoint = tssCommits[0];
    const tssPubKey = pointToHex(tssPubKeyPoint);
    const { serverEndpoints, serverPubKeys, serverThreshold, selectedServers, authSignatures } = serverOpts;

    const rssClient = new RSSClient({
      serverEndpoints,
      serverPubKeys,
      serverThreshold,
      tssPubKey,
      keyType: this.keyType,
    });

    if (!this.metadata.factorPubs) throw CoreError.default(`factorPubs obj not found`);
    if (!factorPubs) throw CoreError.default(`factorPubs not found for tssTag ${this.tssTag}`);
    if (factorPubs.length === 0) throw CoreError.default(`factorPubs is empty`);

    if (!this.metadata.tssNonces) throw CoreError.default(`tssNonces obj not found`);
    const tssNonce: number = this.metadata.tssNonces[this.tssTag] || 0;

    const oldLabel = `${verifierNameVerifierId}\u0015${this.tssTag}\u0016${tssNonce}`;
    const newLabel = `${verifierNameVerifierId}\u0015${this.tssTag}\u0016${tssNonce + 1}`;

    const { pubKey: newTSSServerPub, nodeIndexes } = await this.serviceProvider.getTSSPubKey(this.tssTag, tssNonce + 1);
    let finalSelectedServers = selectedServers;

    if (nodeIndexes?.length > 0) {
      finalSelectedServers = nodeIndexes.slice(0, Math.min(selectedServers.length, nodeIndexes.length));
    }
    const refreshResponses = await rssClient.refresh({
      factorPubs: factorPubs.map((f) => pointToHex(f)),
      targetIndexes,
      oldLabel,
      newLabel,
      sigs: authSignatures,
      dkgNewPub: pointToHex(newTSSServerPub),
      inputShare,
      inputIndex,
      selectedServers: finalSelectedServers,
    });

    const secondCommit = pointToElliptic(this._tssCurve, newTSSServerPub).add(ecPoint(this._tssCurve, tssPubKey).neg());
    const newTSSCommits = [
      Point.fromJSON(tssPubKey),
      Point.fromJSON({ x: secondCommit.getX().toString(16, 64), y: secondCommit.getY().toString(16, 64) }),
    ];
    const factorEncs: {
      [factorPubID: string]: FactorEnc;
    } = {};
    for (let i = 0; i < refreshResponses.length; i++) {
      const refreshResponse = refreshResponses[i];
      factorEncs[refreshResponse.factorPub.x.padStart(64, "0")] = {
        type: "hierarchical",
        tssIndex: refreshResponse.targetIndex,
        userEnc: refreshResponse.userFactorEnc,
        serverEncs: refreshResponse.serverFactorEncs,
      };
    }

    this.metadata.addTSSData({
      keyType: this.keyType,
      tssTag: this.tssTag,
      tssNonce: tssNonce + 1,
      tssPolyCommits: newTSSCommits,
      factorPubs,
      factorEncs,
    });
    if (updateMetadata) await this._syncShareMetadata();
  }

  /**
   * Derives the account nonce for the specified account index.
   */
  computeAccountNonce(index?: number): BN {
    if (!index || index === 0) {
      return new BN(0);
    }

    if (this.keyType === KeyType.ed25519) {
      throw new Error("account index not supported with ed25519");
    }

    // generation should occur during tkey.init, fails if accountSalt is absent
    if (!this._accountSalt) {
      throw Error("account salt undefined");
    }
    let accountHash = keccak256(Buffer.from(`${index}${this._accountSalt}`));
    if (accountHash.length === 66) accountHash = accountHash.slice(2);
    return new BN(accountHash, "hex").umod(this._tssCurve.n);
  }

  /**
   * Reconstructs the TKey and finalize intialization.
   */
  async reconstructKey(_reconstructKeyMiddleware?: boolean): Promise<ReconstructedKeyResult> {
    const k = await super.reconstructKey(_reconstructKeyMiddleware);

    // only valid for use Tss
    // assign account salt from tKey store if it exists
    if (Object.keys(this.metadata.tssPolyCommits).length > 0) {
      const accountSalt = (await this.getTKeyStoreItem(TSS_MODULE, "accountSalt")) as IAccountSaltStore;
      if (accountSalt && accountSalt.value) {
        this._accountSalt = accountSalt.value;
      } else {
        const newSalt = generateSalt(this._tssCurve);
        await this._setTKeyStoreItem(TSS_MODULE, {
          id: "accountSalt",
          value: newSalt,
        } as IAccountSaltStore);
        this._accountSalt = newSalt;
        // this is very specific case where exisiting user do not have salt.
        // sync metadata to cloud to ensure salt is stored incase of manual sync mode
        // new user or importKey should not hit this cases
        // NOTE this is not mistake, we force sync for this case
        if (this.manualSync) await this.syncLocalMetadataTransitions();
      }
    }

    return k;
  }

  /**
   * Adds a factor key to the set of authorized keys.
   */
  public async addFactorPub(tssOptions: {
    existingFactorKey: BN;
    newFactorPub: Point;
    newTSSIndex: number;
    selectedServers?: number[];
    authSignatures: string[];
  }) {
    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.privKey) throw new Error("Tkey is not reconstructed");
    if (!this.metadata.tssPolyCommits[this.tssTag]) throw new Error(`tss key has not been initialized for tssTag ${this.tssTag}`);
    const { existingFactorKey, newFactorPub, newTSSIndex, selectedServers, authSignatures } = tssOptions;

    const { tssShare, tssIndex } = await this.getTSSShare(existingFactorKey);
    const existingFactorPubs = this.metadata.factorPubs[this.tssTag];
    const updatedFactorPubs = existingFactorPubs.concat([newFactorPub]);

    // only modify factorPubs
    this.metadata.addTSSData({
      tssTag: this.tssTag,
      tssNonce: this.metadata.tssNonces[this.tssTag],
      tssPolyCommits: this.metadata.tssPolyCommits[this.tssTag],
      factorPubs: updatedFactorPubs,
      factorEncs: this.metadata.factorEncs[this.tssTag],
      keyType: this.keyType,
    });

    const verifierId = this.serviceProvider.getVerifierNameVerifierId();
    const rssNodeDetails = await this._getRssNodeDetails();
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const finalServer = selectedServers || randomSelectedServers;

    const existingTSSIndexes = existingFactorPubs.map((fb) => this.getFactorEncs(fb).tssIndex);
    const updatedTSSIndexes = existingTSSIndexes.concat([newTSSIndex]);

    await this._refreshTSSShares(false, tssShare, tssIndex, updatedFactorPubs, updatedTSSIndexes, verifierId, {
      ...rssNodeDetails,
      selectedServers: finalServer,
      authSignatures,
    });
    await this._syncShareMetadata();
  }

  /**
   * Removes a factor key from the set of authorized keys.
   */
  public async deleteFactorPub(tssOptions: {
    factorKey: BN;
    deleteFactorPub: Point;
    selectedServers?: number[];
    authSignatures: string[];
  }): Promise<void> {
    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.privKey) throw new Error("Tkey is not reconstructed");
    if (!this.metadata.tssPolyCommits[this.tssTag]) throw new Error(`tss key has not been initialized for tssTag ${this.tssTag}`);
    const { factorKey, deleteFactorPub, selectedServers, authSignatures } = tssOptions;
    const existingFactorPubs = this.metadata.factorPubs[this.tssTag];
    const { tssShare, tssIndex } = await this.getTSSShare(factorKey);

    const found = existingFactorPubs.filter((f) => f.x.eq(deleteFactorPub.x) && f.y.eq(deleteFactorPub.y));
    if (found.length === 0) throw CoreError.default("could not find factorPub to delete");
    if (found.length > 1) throw CoreError.default("found two or more factorPubs that match, error in metadata");
    const updatedFactorPubs = existingFactorPubs.filter((f) => !f.x.eq(deleteFactorPub.x) || !f.y.eq(deleteFactorPub.y));
    this.metadata.addTSSData({ keyType: this.keyType, tssTag: this.tssTag, factorPubs: updatedFactorPubs });
    const rssNodeDetails = await this._getRssNodeDetails();
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const finalServer = selectedServers || randomSelectedServers;
    const updatedTSSIndexes = updatedFactorPubs.map((fb) => this.getFactorEncs(fb).tssIndex);

    await this._refreshTSSShares(false, tssShare, tssIndex, updatedFactorPubs, updatedTSSIndexes, this.serviceProvider.getVerifierNameVerifierId(), {
      ...rssNodeDetails,
      selectedServers: finalServer,
      authSignatures,
    });
    await this._syncShareMetadata();
  }

  /**
   * Adjusts a TSS key share based on account index and share coefficient.
   */
  protected adjustTssShare(share: BN, accountIndex: number, coefficient: BN): BN {
    const nonce = this.computeAccountNonce(accountIndex);
    return share.mul(coefficient).add(nonce).umod(this._tssCurve.n);
  }

  /**
   * Initializes a new TSS key under the specified factor key and using the
   * provided user share.
   */
  protected async _initializeNewTSSKey(
    tssTag: string,
    deviceTSSShare: BN,
    factorPub: Point,
    deviceTSSIndex?: number
  ): Promise<InitializeNewTSSKeyResult> {
    const ec = this._tssCurve;
    let tss2: BN;
    const _tssIndex = deviceTSSIndex || 2; // TODO: fix
    if (deviceTSSShare) {
      tss2 = deviceTSSShare;
    } else {
      tss2 = this._tssCurve.genKeyPair().getPrivate();
    }
    const { pubKey: tss1Pub } = await this.serviceProvider.getTSSPubKey(tssTag, 0);
    const tss1PubKey = pointToElliptic(ec, tss1Pub);
    const tss2PubKey = (this._tssCurve.g as BasePoint).mul(tss2);

    const L1_0 = getLagrangeCoeffs(ec, [1, _tssIndex], 1, 0);
    // eslint-disable-next-line camelcase
    const LIndex_0 = getLagrangeCoeffs(ec, [1, _tssIndex], _tssIndex, 0);

    const a0Pub = tss1PubKey.mul(L1_0).add(tss2PubKey.mul(LIndex_0));
    const a1Pub = tss1PubKey.add(a0Pub.neg());

    const tssPolyCommits = [Point.fromSEC1(a0Pub.encodeCompressed("hex"), this.keyType), Point.fromSEC1(a1Pub.encodeCompressed("hex"), this.keyType)];
    const factorPubs = [factorPub];
    const factorEncs: { [factorPubID: string]: FactorEnc } = {};

    for (let i = 0; i < factorPubs.length; i++) {
      const f = factorPubs[i];
      const factorPubID = f.x.toString(16, 64);
      factorEncs[factorPubID] = {
        tssIndex: _tssIndex,
        type: "direct",
        userEnc: await encrypt(Buffer.from(f.toSEC1(false), "hex"), Buffer.from(tss2.toString(16, 64), "hex")),
        serverEncs: [],
      };
    }

    return {
      tss2,
      factorEncs,
      factorPubs,
      tssPolyCommits,
    };
  }
}
