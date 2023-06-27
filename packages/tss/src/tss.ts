import {
  BNString,
  decrypt,
  ecCurve,
  ecPoint,
  encrypt,
  FactorEnc,
  GenerateNewShareResult,
  getPubKeyPoint,
  hexPoint,
  IMetadata,
  InitializeNewTSSKeyResult,
  LocalMetadataTransitions,
  Point,
  PointHex,
  randomSelection,
  RSSClient,
  ShareStore,
  TkeyStatus,
} from "@tkey/common-types";
import ThresholdKey, { dotProduct, getLagrangeCoeffs, kCombinations } from "@tkey/core";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";

import { TSSError } from "./errors";

export const TSS_MODULE_NAME = "TSSModule";

export class TSSModule {
  moduleName: string;

  tssTag: string;

  constructor(moduleName = TSS_MODULE_NAME, tssTag = "default") {
    this.moduleName = moduleName;
    this.tssTag = tssTag;
  }

  async initializeWithTss(
    tkey: ThresholdKey,
    tssOptions: { deviceTSSShare: BN; deviceTSSIndex: number; factorPub: Point },
    params?: {
      withShare?: ShareStore;
      importKey?: BN;
      neverInitializeNewKey?: boolean;
      transitionMetadata?: IMetadata;
      previouslyFetchedCloudMetadata?: IMetadata;
      previousLocalMetadataTransitions?: LocalMetadataTransitions;
      delete1OutOf1?: boolean;
    }
  ) {
    const { deviceTSSIndex, deviceTSSShare, factorPub } = tssOptions;
    const result = await tkey.initialize(params);

    const metadata = tkey.getMetadata();
    if (result.deviceShare) {
      const { factorEncs, factorPubs, tssPolyCommits } = await this._initializeNewTSSKey(
        tkey,
        this.tssTag,
        deviceTSSShare,
        factorPub,
        deviceTSSIndex
      );
      metadata.addTSSData({ tssTag: this.tssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });
    } else if (!metadata.tssPolyCommits[this.tssTag]) {
      // if tss shares have not been created for this tssTag, create new tss sharing
      const { factorEncs, factorPubs, tssPolyCommits } = await this._initializeNewTSSKey(tkey, this.tssTag, deviceTSSShare, factorPub);
      await this.addTSSMetadata(tkey, {
        tssTag: this.tssTag,
        tssNonce: 0,
        tssPolyCommits,
        factorPubs,
        factorEncs,
      });
    }
    return result;
  }

  async createTaggedTSSShare(tkey: ThresholdKey, tssTag: string, factorPub: Point, tssShare: BN, tssIndex: number) {
    if (tkey.getTkeyStatus() !== TkeyStatus.RECONSTRUCTED) throw TSSError.default("tkey must be reconstructed");
    const { factorEncs, factorPubs, tssPolyCommits } = await this._initializeNewTSSKey(tkey, tssTag, tssShare, factorPub, tssIndex);
    await this.addTSSMetadata(tkey, {
      tssTag,
      tssNonce: 0,
      tssPolyCommits,
      factorPubs,
      factorEncs,
    });
  }

  getTSSCommits(tkey: ThresholdKey, tssTag?: string): Point[] {
    // if (!this.privKey) throw TSSError.default("tss pub cannot be returned until you've reconstructed tkey");
    // if (!this.metadata) throw TSSError.metadataUndefined();
    if (tkey.getTkeyStatus() !== TkeyStatus.RECONSTRUCTED) throw TSSError.default("tkey must be reconstructed");
    if (!tssTag) tssTag = this.tssTag;
    const metadata = tkey.getMetadata();
    const tssPolyCommits = metadata.tssPolyCommits[tssTag];
    if (!tssPolyCommits) throw TSSError.default(`tss poly commits not found for tssTag ${tssTag}`);
    if (tssPolyCommits.length === 0) throw TSSError.default("tss poly commits is empty");
    return tssPolyCommits;
  }

  getTSSPub(tkey: ThresholdKey, tssTag?: string): Point {
    if (!tssTag) tssTag = this.tssTag;
    return this.getTSSCommits(tkey, tssTag)[0];
  }

  /**
   * getTSSShare accepts a factorKey and returns the TSS share based on the factor encrypted TSS shares in the metadata
   * @param factorKey - factor key
   */
  async getTSSShare(tkey: ThresholdKey, factorKey: BN, opts?: { threshold?: number; tssTag?: string }): Promise<{ tssIndex: number; tssShare: BN }> {
    if (tkey.getTkeyStatus() !== TkeyStatus.RECONSTRUCTED) throw TSSError.default("tkey must be reconstructed");

    const tssTag = opts?.tssTag || this.tssTag;

    const factorPub = getPubKeyPoint(factorKey);
    const factorEncs = this.getFactorEncs(tkey, factorPub, tssTag);
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
    const tssCommits = this.getTSSCommits(tkey, tssTag);

    const userDec = tssShareBNs[0];

    if (type === "direct") {
      const tssSharePub = ecCurve.g.mul(userDec);
      const tssCommitA0 = ecCurve.keyFromPublic({ x: tssCommits[0].x.toString(16, 64), y: tssCommits[0].y.toString(16, 64) }).getPublic();
      const tssCommitA1 = ecCurve.keyFromPublic({ x: tssCommits[1].x.toString(16, 64), y: tssCommits[1].y.toString(16, 64) }).getPublic();
      let _tssSharePub = tssCommitA0;
      for (let j = 0; j < tssIndex; j++) {
        _tssSharePub = _tssSharePub.add(tssCommitA1);
      }
      if (tssSharePub.getX().cmp(_tssSharePub.getX()) === 0 && tssSharePub.getY().cmp(_tssSharePub.getY()) === 0) {
        return { tssIndex, tssShare: userDec };
      }
      throw new Error("user decryption does not match tss commitments...");
    }

    // if type === "hierarchical"
    const serverDecs = tssShareBNs.slice(1); // 5 elems
    const serverIndexes = new Array(serverDecs.length).fill(null).map((_, i) => i + 1);

    const { threshold } = opts || {};

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
        return { tssIndex, tssShare };
      }
    }
    throw new Error("could not find any combination of server decryptions that match tss commitments...");
  }

  //   getFactorEncryptedData() {}
  getFactorEncs(tkey: ThresholdKey, factorPub: Point, tssTag: string): FactorEnc {
    const metadata = tkey.getMetadata();
    if (!metadata) throw TSSError.default("no metadata found");
    if (!metadata.factorEncs) throw TSSError.default("no factor encs mapping");
    if (!metadata.factorPubs) throw TSSError.default("no factor pubs mapping");

    const factorPubs = metadata.factorPubs[tssTag];
    if (!factorPubs) throw TSSError.default(`no factor pubs for this tssTag ${tssTag}`);
    if (factorPubs.filter((f) => f.x.cmp(factorPub.x) === 0 && f.y.cmp(factorPub.y) === 0).length === 0)
      throw TSSError.default(`factor pub ${factorPub.x} not found for tssTag ${tssTag}`);
    if (!metadata.factorEncs[tssTag]) throw TSSError.default(`no factor encs for tssTag ${tssTag}`);

    const factorPubID = factorPub.x.toString(16, 64);
    return metadata.factorEncs[tssTag][factorPubID];
  }

  async generateNewShare(
    tkey: ThresholdKey,
    tssOptions?: {
      inputTSSShare: BN;
      inputTSSIndex: number;
      newFactorPub: Point;
      newTSSIndex: number;
      authSignatures?: string[];
      selectedServers?: number[];
      tssTag?: string;
    }
  ): Promise<GenerateNewShareResult> {
    if (!tssOptions) throw TSSError.default("must provide tss options when calling generateNewShare with useTSS true");
    const { newFactorPub, inputTSSIndex, inputTSSShare, newTSSIndex, selectedServers, authSignatures } = tssOptions;
    const tssTag = tssOptions?.tssTag || this.tssTag;

    const metadata = tkey.getMetadata();
    if (!metadata.tssPolyCommits[tssTag]) throw new Error(`tss key has not been initialized for tssTag ${tssTag}`);
    const existingFactorPubs = metadata.factorPubs[tssTag];
    const updatedFactorPubs = existingFactorPubs.concat([newFactorPub]);

    // only modify factorPubs
    metadata.addTSSData({
      tssTag: this.tssTag,
      tssNonce: metadata.tssNonces[tssTag],
      tssPolyCommits: metadata.tssPolyCommits[tssTag],
      factorPubs: updatedFactorPubs,
      factorEncs: metadata.factorEncs[tssTag],
    });

    const verifierId = tkey.getServiceProvider().getVerifierNameVerifierId();
    const rssNodeDetails = await this._getRssNodeDetails(tkey);
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const existingTSSIndexes = existingFactorPubs.map((fb) => this.getFactorEncs(tkey, fb, tssTag).tssIndex);
    const updatedTSSIndexes = existingTSSIndexes.concat([newTSSIndex]);

    await this._refreshTSSShares(tkey, false, inputTSSShare, inputTSSIndex, updatedFactorPubs, updatedTSSIndexes, verifierId, tssTag, {
      ...rssNodeDetails,
      selectedServers: selectedServers || randomSelectedServers,
      authSignatures,
    });

    const newShare = await tkey.generateNewShare();
    return newShare;
  }

  async deleteShare(
    tkey: ThresholdKey,
    tssOptions: {
      inputTSSShare: BN;
      inputTSSIndex: number;
      factorPub: Point;
      authSignatures: string[];
      selectedServers?: number[];
      tssTag?: string;
    },
    shareIndex: BNString
  ) {
    const tssTag = tssOptions?.tssTag || this.tssTag;

    const metadata = tkey.getMetadata();
    const { factorPub, inputTSSIndex, inputTSSShare, selectedServers, authSignatures } = tssOptions;
    const existingFactorPubs = metadata.factorPubs[tssTag];

    const found = existingFactorPubs.filter((f) => f.x.eq(factorPub.x) && f.y.eq(factorPub.y));
    if (found.length === 0) throw TSSError.default("could not find factorPub to delete");
    if (found.length > 1) throw TSSError.default("found two or more factorPubs that match, error in metadata");
    const updatedFactorPubs = existingFactorPubs.filter((f) => !f.x.eq(factorPub.x) || !f.y.eq(factorPub.y));
    metadata.addTSSData({ tssTag, factorPubs: updatedFactorPubs });
    const rssNodeDetails = await this._getRssNodeDetails(tkey);
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const updatedTSSIndexes = updatedFactorPubs.map((fb) => this.getFactorEncs(tkey, fb, tssTag).tssIndex);

    await this._refreshTSSShares(
      tkey,
      false,
      inputTSSShare,
      inputTSSIndex,
      updatedFactorPubs,
      updatedTSSIndexes,
      tkey.getServiceProvider().getVerifierNameVerifierId(),
      tssTag,
      {
        ...rssNodeDetails,
        selectedServers: selectedServers || randomSelectedServers,
        authSignatures,
      }
    );

    // delete associated tkey share
    const result = await tkey.deleteShare(shareIndex);
    return result;
  }

  async _initializeNewTSSKey(
    tkey: ThresholdKey,
    tssTag: string,
    deviceTSSShare,
    factorPub: Point,
    deviceTSSIndex?: number
  ): Promise<InitializeNewTSSKeyResult> {
    let tss2: BN;
    const _tssIndex = deviceTSSIndex || 2; // TODO: fix
    if (deviceTSSShare) {
      tss2 = deviceTSSShare;
    } else {
      tss2 = new BN(generatePrivate());
    }

    const { pubKey: tss1Pub } = await tkey.serviceProvider.getTSSPubKey(tssTag, 0);
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

  async _refreshTSSShares(
    tkey: ThresholdKey,
    updateMetadata: boolean,
    inputShare: BN,
    inputIndex: number,
    factorPubs: Point[],
    targetIndexes: number[],
    verifierNameVerifierId: string,
    tssTag: string,
    serverOpts: {
      serverEndpoints: string[];
      serverPubKeys: PointHex[];
      serverThreshold: number;
      selectedServers: number[];
      authSignatures: string[];
    }
  ): Promise<void> {
    // if (!this.metadata) throw TSSError.metadataUndefined();
    if (tkey.getTkeyStatus() !== TkeyStatus.RECONSTRUCTED) throw TSSError.default(`tkey is not active`);
    if (!tkey.metadata.tssPolyCommits) throw TSSError.default(`tss poly commits obj not found`);

    const tssTagLocal = tssTag || this.tssTag;
    const metadata = tkey.getMetadata();
    const tssCommits = metadata.tssPolyCommits[tssTagLocal];
    if (!tssCommits) throw TSSError.default(`tss commits not found for tssTag ${tssTagLocal}`);
    if (tssCommits.length === 0) throw TSSError.default(`tssCommits is empty`);
    const tssPubKeyPoint = tssCommits[0];
    const tssPubKey = hexPoint(tssPubKeyPoint);
    const { serverEndpoints, serverPubKeys, serverThreshold, selectedServers, authSignatures } = serverOpts;

    const rssClient = new RSSClient({
      serverEndpoints,
      serverPubKeys,
      serverThreshold,
      tssPubKey,
    });

    if (!metadata.factorPubs) throw TSSError.default(`factorPubs obj not found`);
    if (!factorPubs) throw TSSError.default(`factorPubs not found for tssTag ${tssTagLocal}`);
    if (factorPubs.length === 0) throw TSSError.default(`factorPubs is empty`);

    if (!metadata.tssNonces) throw TSSError.default(`tssNonces obj not found`);
    const tssNonce: number = metadata.tssNonces[tssTagLocal] || 0;

    const oldLabel = `${verifierNameVerifierId}\u0015${tssTagLocal}\u0016${tssNonce}`;
    const newLabel = `${verifierNameVerifierId}\u0015${tssTagLocal}\u0016${tssNonce + 1}`;

    const { pubKey: newTSSServerPub, nodeIndexes } = await tkey.serviceProvider.getTSSPubKey(tssTagLocal, tssNonce + 1);
    let finalSelectedServers = selectedServers;

    if (nodeIndexes?.length > 0) {
      finalSelectedServers = nodeIndexes.slice(0, Math.min(selectedServers.length, nodeIndexes.length));
    }
    // eslint-disable-next-line no-console
    console.log("newTSSServerPub", finalSelectedServers, nodeIndexes, newTSSServerPub.x.toString("hex"), tssTagLocal, tssNonce + 1);

    const refreshResponses = await rssClient.refresh({
      factorPubs: factorPubs.map((f) => hexPoint(f)),
      targetIndexes,
      oldLabel,
      newLabel,
      sigs: authSignatures,
      dkgNewPub: hexPoint(newTSSServerPub),
      inputShare,
      inputIndex,
      selectedServers,
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

    metadata.addTSSData({ tssTag: tssTagLocal, tssNonce: tssNonce + 1, tssPolyCommits: newTSSCommits, factorPubs, factorEncs });
    if (updateMetadata) await tkey._syncShareMetadata();
  }

  async _getRssNodeDetails(tkey: ThresholdKey): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    const { serverEndpoints, serverPubKeys, serverThreshold } = await tkey.getServiceProvider().getRSSNodeDetails();
    if (!Array.isArray(serverEndpoints) || serverEndpoints.length === 0) throw new Error("service provider tss server endpoints are missing");
    if (!Array.isArray(serverPubKeys) || serverPubKeys.length === 0) throw new Error("service provider pub keys are missing");
    return {
      serverEndpoints,
      serverPubKeys,
      serverThreshold: serverThreshold || Math.floor(serverEndpoints.length / 2) + 1,
    };
  }

  async addTSSMetadata(
    tkey: ThresholdKey,
    tssData: {
      tssTag?: string;
      tssNonce?: number;
      tssPolyCommits?: Point[];
      factorPubs?: Point[];
      factorEncs?: {
        [factorPubID: string]: FactorEnc;
      };
    }
  ) {
    // overwrite default tss tag if provided from args
    tkey.metadata.addTSSData({ tssTag: this.tssTag, ...tssData });
    await tkey._syncShareMetadata();
    if (!tkey.manualSync) tkey.syncLocalMetadataTransitions();
  }
}

export default TSSModule;
