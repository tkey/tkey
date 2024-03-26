import { decrypt, ecCurve, encrypt, getPubKeyPoint, KeyDetails, LocalMetadataTransitions, Point, ShareStore, TKeyArgs } from "@tkey/common-types";
import ThresholdKey, { CoreError, lagrangeInterpolation, Metadata } from "@tkey/core";
import { generatePrivate } from "@toruslabs/eccrypto";
import { dotProduct, ecPoint, getLagrangeCoeffs, hexPoint, PointHex, randomSelection, RSSClient } from "@toruslabs/rss-client";
import BN from "bn.js";
import { keccak256 } from "ethereum-cryptography/keccak";

import { TSSTorusServiceProvider } from ".";
import { FactorEnc, IAccountSaltStore, InitializeNewTSSKeyResult } from "./common";
import { generateSalt, kCombinations } from "./util";

export const TSS_MODULE = "tssModule";

export interface TSSTKeyArgs extends TKeyArgs {
  serviceProvider: TSSTorusServiceProvider;
  tssTag?: string;
}

export interface TKeyInitArgs {
  withShare?: ShareStore;
  importKey?: BN;
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
}

export class TKeyTSS extends ThresholdKey {
  serviceProvider: TSSTorusServiceProvider = null;

  private _tssTag: string;

  private _accountSalt: string;

  constructor(args?: TSSTKeyArgs) {
    super(args);
    const { serviceProvider, storageLayer, tssTag = "default" } = args;
    this.serviceProvider = serviceProvider;
    this.storageLayer = storageLayer;
    this._tssTag = tssTag;
  }

  public get tssTag(): string {
    return this._tssTag;
  }

  async initialize(params?: TKeyTSSInitArgs): Promise<KeyDetails> {
    const keyDetails = await super.initialize(params);

    if (!this.metadata.tssPolyCommits[this.tssTag]) {
      // if tss shares have not been created for this tssTag, create new tss sharing
      const { factorEncs, factorPubs, tssPolyCommits } = await this._initializeNewTSSKey(this.tssTag, params.deviceTSSShare, params.factorPub);
      this.metadata.addTSSData({ tssTag: this.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
      const accountSalt = generateSalt();
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
    }
  ): Promise<{
    tssIndex: number;
    tssShare: BN;
  }> {
    if (!this.privKey) throw CoreError.default("tss share cannot be returned until you've reconstructed tkey");
    const factorPub = getPubKeyPoint(factorKey);
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
      return new BN(buf.toString("hex"), "hex");
    });
    const tssCommits = this.getTSSCommits();

    const userDec = tssShareBNs[0];

    const { threshold, accountIndex } = opts || {};
    if (type === "direct") {
      const tssSharePub = ecCurve.g.mul(userDec);
      const tssCommitA0 = ecCurve.keyFromPublic({ x: tssCommits[0].x.toString(16, 64), y: tssCommits[0].y.toString(16, 64) }).getPublic();
      const tssCommitA1 = ecCurve.keyFromPublic({ x: tssCommits[1].x.toString(16, 64), y: tssCommits[1].y.toString(16, 64) }).getPublic();
      let _tssSharePub = tssCommitA0;
      for (let j = 0; j < tssIndex; j++) {
        _tssSharePub = _tssSharePub.add(tssCommitA1);
      }
      if (tssSharePub.getX().cmp(_tssSharePub.getX()) === 0 && tssSharePub.getY().cmp(_tssSharePub.getY()) === 0) {
        if (accountIndex && accountIndex > 0) {
          const nonce = this.computeAccountNonce(accountIndex);
          const derivedShare = userDec.add(nonce).umod(ecCurve.n);
          return { tssIndex, tssShare: derivedShare };
        }
        return { tssIndex, tssShare: userDec };
      }
      throw new Error("user decryption does not match tss commitments...");
    }

    // if type === "hierarchical"
    const serverDecs = tssShareBNs.slice(1); // 5 elems
    const serverIndexes = new Array(serverDecs.length).fill(null).map((_, i) => i + 1);

    const combis = kCombinations(serverDecs.length, threshold || Math.ceil(serverDecs.length / 2));
    for (let i = 0; i < combis.length; i++) {
      const combi = combis[i];
      const selectedServerDecs = serverDecs.filter((_, j) => combi.indexOf(j) > -1);
      if (selectedServerDecs.includes(null)) continue;

      const selectedServerIndexes = serverIndexes.filter((_, j) => combi.indexOf(j) > -1);
      const serverLagrangeCoeffs = selectedServerIndexes.map((x) => getLagrangeCoeffs(selectedServerIndexes, x));
      const serverInterpolated = dotProduct(serverLagrangeCoeffs, selectedServerDecs, ecCurve.n);
      const lagrangeCoeffs = [getLagrangeCoeffs([1, 99], 1), getLagrangeCoeffs([1, 99], 99)];
      const tssShare = dotProduct(lagrangeCoeffs, [serverInterpolated, userDec], ecCurve.n);
      const tssSharePub = ecCurve.g.mul(tssShare);
      const tssCommitA0 = ecCurve.keyFromPublic({ x: tssCommits[0].x.toString(16, 64), y: tssCommits[0].y.toString(16, 64) }).getPublic();
      const tssCommitA1 = ecCurve.keyFromPublic({ x: tssCommits[1].x.toString(16, 64), y: tssCommits[1].y.toString(16, 64) }).getPublic();
      let _tssSharePub = tssCommitA0;
      for (let j = 0; j < tssIndex; j++) {
        _tssSharePub = _tssSharePub.add(tssCommitA1);
      }
      if (tssSharePub.getX().cmp(_tssSharePub.getX()) === 0 && tssSharePub.getY().cmp(_tssSharePub.getY()) === 0) {
        if (accountIndex && accountIndex > 0) {
          const nonce = this.computeAccountNonce(accountIndex);
          const derivedShare = tssShare.add(nonce).umod(ecCurve.n);
          return { tssIndex, tssShare: derivedShare };
        }
        return { tssIndex, tssShare };
      }
    }
    throw new Error("could not find any combination of server decryptions that match tss commitments...");
  }

  getTSSCommits(): Point[] {
    if (!this.privKey) throw CoreError.default("tss pub cannot be returned until you've reconstructed tkey");
    if (!this.metadata) throw CoreError.metadataUndefined();
    const tssPolyCommits = this.metadata.tssPolyCommits[this.tssTag];
    if (!tssPolyCommits) throw CoreError.default(`tss poly commits not found for tssTag ${this.tssTag}`);
    if (tssPolyCommits.length === 0) throw CoreError.default("tss poly commits is empty");
    return tssPolyCommits;
  }

  getTSSPub(accountIndex?: number): Point {
    const tssCommits = this.getTSSCommits();
    if (accountIndex && accountIndex > 0) {
      const nonce = this.computeAccountNonce(accountIndex);
      // we need to add the pub key nonce to the tssPub
      const noncePub = ecCurve.keyFromPrivate(nonce.toString("hex")).getPublic();
      const pubKeyPoint = ecCurve.keyFromPublic({ x: tssCommits[0].x.toString("hex"), y: tssCommits[0].y.toString("hex") }).getPublic();
      const devicePubKeyPoint = pubKeyPoint.add(noncePub);
      return new Point(devicePubKeyPoint.getX().toString("hex"), devicePubKeyPoint.getY().toString("hex"));
    }
    return tssCommits[0];
  }

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

  async importTssKey(
    params: {
      tag: string;
      importKey: BN;
      factorPub: Point;
      newTSSIndex: number;
    },
    serverOpts: {
      selectedServers?: number[];
      authSignatures: string[];
    }
  ): Promise<void> {
    if (!this.privKey) throw CoreError.privateKeyUnavailable();
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }
    const { importKey, factorPub, newTSSIndex, tag } = params;
    if (!importKey || importKey.eq(new BN("0"))) {
      throw new Error("Invalid importedKey");
    }

    const oldTag = this.tssTag;
    try {
      const { selectedServers = [], authSignatures = [] } = serverOpts || {};
      this._tssTag = tag;

      if (!tag) throw CoreError.default(`invalid param, tag is required`);
      if (!factorPub) throw CoreError.default(`invalid param, newFactorPub is required`);
      if (!newTSSIndex) throw CoreError.default(`invalid param, newTSSIndex is required`);
      if (authSignatures.length === 0) throw CoreError.default(`invalid param, authSignatures is required`);

      const existingFactorPubs = this.metadata.factorPubs[tag];
      if (existingFactorPubs?.length > 0) {
        throw CoreError.default(`Duplicate account tag, please use a unique tag for importing key`);
      }
      const factorPubs = [factorPub];

      const tssIndexes = [newTSSIndex];
      const existingNonce = this.metadata.tssNonces[this.tssTag];
      const newTssNonce: number = existingNonce && existingNonce > 0 ? existingNonce + 1 : 0;
      const verifierAndVerifierID = this.serviceProvider.getVerifierNameVerifierId();
      const label = `${verifierAndVerifierID}\u0015${this.tssTag}\u0016${newTssNonce}`;
      const tssPubKey = hexPoint(ecCurve.g.mul(importKey));
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
      });

      const refreshResponses = await rssClient.import({
        importKey,
        dkgNewPub: hexPoint(newTSSServerPub),
        selectedServers: finalSelectedServers,
        factorPubs: factorPubs.map((f) => hexPoint(f)),
        targetIndexes: tssIndexes,
        newLabel: label,
        sigs: authSignatures,
      });
      const secondCommit = ecPoint(hexPoint(newTSSServerPub)).add(ecPoint(tssPubKey).neg());
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
      });
      if (!this._accountSalt) {
        const accountSalt = generateSalt();
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

  async _UNSAFE_exportTssKey(tssOptions: { factorKey: BN; selectedServers: number[]; authSignatures: string[] }): Promise<BN> {
    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.privKey) throw new Error("Tkey is not reconstructed");
    if (!this.metadata.tssPolyCommits[this.tssTag]) throw new Error(`tss key has not been initialized for tssTag ${this.tssTag}`);

    const { factorKey, selectedServers, authSignatures } = tssOptions;

    const { tssIndex } = await this.getTSSShare(factorKey);
    // Assumption that there are only index 2 and 3 for tss shares
    // create complement index share
    const tempShareIndex = tssIndex === 2 ? 3 : 2;
    const tempFactorKey = new BN(generatePrivate());
    const tempFactorPub = getPubKeyPoint(tempFactorKey);

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
    const finalKey = lagrangeInterpolation([tempShare, factorShare], [new BN(tempIndex), new BN(factorIndex)]);

    // deleted created tss share
    await this.deleteFactorPub({
      factorKey,
      deleteFactorPub: tempFactorPub,
      authSignatures,
      selectedServers,
    });

    return finalKey;
  }

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
    const tssPubKey = hexPoint(tssPubKeyPoint);
    const { serverEndpoints, serverPubKeys, serverThreshold, selectedServers, authSignatures } = serverOpts;

    const rssClient = new RSSClient({
      serverEndpoints,
      serverPubKeys,
      serverThreshold,
      tssPubKey,
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
      factorPubs: factorPubs.map((f) => hexPoint(f)),
      targetIndexes,
      oldLabel,
      newLabel,
      sigs: authSignatures,
      dkgNewPub: hexPoint(newTSSServerPub),
      inputShare,
      inputIndex,
      selectedServers: finalSelectedServers,
    });

    const secondCommit = ecPoint(hexPoint(newTSSServerPub)).add(ecPoint(tssPubKey).neg());
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

    this.metadata.addTSSData({ tssTag: this.tssTag, tssNonce: tssNonce + 1, tssPolyCommits: newTSSCommits, factorPubs, factorEncs });
    if (updateMetadata) await this._syncShareMetadata();
  }

  async _initializeNewTSSKey(tssTag: string, deviceTSSShare: BN, factorPub: Point, deviceTSSIndex?: number): Promise<InitializeNewTSSKeyResult> {
    let tss2: BN;
    const _tssIndex = deviceTSSIndex || 2; // TODO: fix
    if (deviceTSSShare) {
      tss2 = deviceTSSShare;
    } else {
      tss2 = new BN(generatePrivate());
    }
    const { pubKey: tss1Pub } = await this.serviceProvider.getTSSPubKey(tssTag, 0);
    const tss1PubKey = ecCurve.keyFromPublic({ x: tss1Pub.x.toString(16, 64), y: tss1Pub.y.toString(16, 64) }).getPublic();
    const tss2Pub = getPubKeyPoint(tss2);
    const tss2PubKey = ecCurve.keyFromPublic({ x: tss2Pub.x.toString(16, 64), y: tss2Pub.y.toString(16, 64) }).getPublic();

    const L1_0 = getLagrangeCoeffs([1, _tssIndex], 1, 0);
    // eslint-disable-next-line camelcase
    const LIndex_0 = getLagrangeCoeffs([1, _tssIndex], _tssIndex, 0);

    const a0Pub = tss1PubKey.mul(L1_0).add(tss2PubKey.mul(LIndex_0));
    const a1Pub = tss1PubKey.add(a0Pub.neg());

    const tssPolyCommits = [
      new Point(a0Pub.getX().toString(16, 64), a0Pub.getY().toString(16, 64)),
      new Point(a1Pub.getX().toString(16, 64), a1Pub.getY().toString(16, 64)),
    ];
    const factorPubs = [factorPub];
    const factorEncs: { [factorPubID: string]: FactorEnc } = {};

    for (let i = 0; i < factorPubs.length; i++) {
      const f = factorPubs[i];
      const factorPubID = f.x.toString(16, 64);
      factorEncs[factorPubID] = {
        tssIndex: _tssIndex,
        type: "direct",
        userEnc: await encrypt(
          Buffer.concat([Buffer.from("04", "hex"), Buffer.from(f.x.toString(16, 64), "hex"), Buffer.from(f.y.toString(16, 64), "hex")]),
          Buffer.from(tss2.toString(16, 64), "hex")
        ),
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

  computeAccountNonce(index: number): BN {
    // generation should occur during tkey.init, fails if accountSalt is absent
    if (!this._accountSalt) {
      throw Error("account salt undefined");
    }
    let accountHash = keccak256(Buffer.from(`${index}${this._accountSalt}`));
    if (accountHash.length === 66) accountHash = accountHash.slice(2);
    return index && index > 0 ? new BN(accountHash, "hex").umod(ecCurve.curve.n) : new BN(0);
  }

  // Generate new TSS share linked to given factor public key.
  private async addFactorPub(tssOptions: {
    existingFactorKey: BN;
    newFactorPub: Point;
    newTSSIndex: number;
    selectedServers: number[];
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
    });

    const verifierId = this.serviceProvider.getVerifierNameVerifierId();
    const rssNodeDetails = await this._getRssNodeDetails();
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const finalServer = selectedServers.length ? selectedServers : randomSelectedServers;

    const existingTSSIndexes = existingFactorPubs.map((fb) => this.getFactorEncs(fb).tssIndex);
    const updatedTSSIndexes = existingTSSIndexes.concat([newTSSIndex]);

    await this._refreshTSSShares(false, tssShare, tssIndex, updatedFactorPubs, updatedTSSIndexes, verifierId, {
      ...rssNodeDetails,
      selectedServers: finalServer,
      authSignatures,
    });
    await this._syncShareMetadata();
  }

  // Delete TSS Share linked to given factor public key.
  private async deleteFactorPub(tssOptions: {
    factorKey: BN;
    deleteFactorPub: Point;
    selectedServers: number[];
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
    this.metadata.addTSSData({ tssTag: this.tssTag, factorPubs: updatedFactorPubs });
    const rssNodeDetails = await this._getRssNodeDetails();
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const finalServer = selectedServers.length ? selectedServers : randomSelectedServers;
    const updatedTSSIndexes = updatedFactorPubs.map((fb) => this.getFactorEncs(fb).tssIndex);

    await this._refreshTSSShares(false, tssShare, tssIndex, updatedFactorPubs, updatedTSSIndexes, this.serviceProvider.getVerifierNameVerifierId(), {
      ...rssNodeDetails,
      selectedServers: finalServer,
      authSignatures,
    });
    await this._syncShareMetadata();
  }
}
