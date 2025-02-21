import {
  decrypt,
  EllipticPoint,
  encrypt,
  EncryptedMessage,
  KeyDetails,
  KeyType,
  Point,
  ReconstructedKeyResult,
  secp256k1,
  StringifiedType,
  TKeyArgs,
  TKeyInitArgs,
} from "@tkey/common-types";
import { CoreError, TKey } from "@tkey/core";
import { post } from "@toruslabs/http-helpers";
import { dotProduct, ecPoint, hexPoint, PointHex, randomSelection, RSSClient } from "@toruslabs/rss-client";
import { getEcCurve, getEd25519ExtendedPublicKey as getEd25519KeyPairFromSeed, getKeyCurve, getSecpKeyFromEd25519 } from "@toruslabs/torus.js";
import BN from "bn.js";
import { ec as EC } from "elliptic";
import { keccak256 } from "ethereum-cryptography/keccak";

import { TSSTorusServiceProvider } from ".";
import {
  CopyRemoteTssParams,
  FactorEnc,
  IAccountSaltStore,
  InitializeNewTSSKeyResult,
  IRemoteClientState,
  RefreshRemoteTssParams,
  RefreshRemoteTssReturnType,
} from "./common";
import {
  generateSalt,
  getEd25519SeedStoreDomainKey,
  getLagrangeCoeffs,
  getPubKeyPoint,
  kCombinations,
  lagrangeInterpolation,
  pointToHex,
} from "./util";

export const TSS_MODULE = "tssModule";
export const TSS_TAG_DEFAULT = "default";

export const FACTOR_KEY_TYPE = "secp256k1";
export const factorKeyCurve = new EC(FACTOR_KEY_TYPE);

export const LEGACY_KEY_TYPE = "secp256k1";

export interface TSSTKeyArgs extends TKeyArgs {
  serviceProvider: TSSTorusServiceProvider;
  // tssKeyType: KeyType;
  tssTag?: string;
  legacyMetadataFlag?: boolean;
}

export interface TKeyTSSInitArgs {
  tssKeyType: KeyType;
  deviceTSSShare?: BN;
  deviceTSSIndex?: number;
  factorPub?: Point;
  importKey?: Buffer;
  serverOpts: {
    selectedServers?: number[];
    authSignatures: string[];
  };
}

export class TKeyTSS extends TKey {
  serviceProvider: TSSTorusServiceProvider = null;

  // private _tssKeyType: KeyType;

  // private _tssCurve: EC;

  private _tssTag: string;

  private _accountSalt: string;

  /**
   * Constructs a new TKeyTSS instance using the given parameters.
   */
  constructor(args: TSSTKeyArgs) {
    super(args);
    const { serviceProvider, storageLayer, tssTag = "default", legacyMetadataFlag } = args;

    if (serviceProvider.customAuthArgs.keyType === KeyType.ed25519 && !legacyMetadataFlag) {
      throw CoreError.default(
        `service provider keyType mismatch: ${serviceProvider.customAuthArgs.keyType} require legacyMetadataFlag to be set to true ");`
      );
    }

    this.serviceProvider = serviceProvider;
    this.storageLayer = storageLayer;
    this._tssTag = tssTag;
    // this._tssKeyType = tssKeyType;
    // this._tssCurve = new EC(tssKeyType);
    this.legacyMetadataFlag = legacyMetadataFlag;
  }

  // public get tssKeyType(): KeyType {
  //   return this._tssKeyType;
  // }

  // public get tssCurve(): EllipticCurve {
  //   return this._tssCurve;
  // }

  static async fromJSON(value: StringifiedType, args: TSSTKeyArgs): Promise<TKeyTSS> {
    // legacyMetadataFlag need to be provided during constructor as tkey's fromJson is depending on the flag
    const tbTss = new TKeyTSS({ ...args, legacyMetadataFlag: value.legacyMetadataFlag ?? false });
    const tb = await super.fromJSON(value, args);

    const { tssTag, accountSalt } = value;

    if (tssTag !== tbTss._tssTag) {
      throw CoreError.default(`tssTag mismatch: ${tssTag} !== ${tbTss._tssTag}`);
    }

    // if (tssKeyType !== tbTss.tssKeyType) {
    //   throw CoreError.default(`tssKeyType mismatch: ${tssKeyType} !== ${tbTss.tssKeyType}`);
    // }

    // copy over tkey to tkeyTss
    tbTss.shares = tb.shares;
    tbTss.metadata = tb.metadata;
    tbTss.lastFetchedCloudMetadata = tb.lastFetchedCloudMetadata;
    tbTss._localMetadataTransitions = tb._localMetadataTransitions;

    // this will be computed during reconstruct tkey
    // should we restore here?
    tbTss._accountSalt = accountSalt;
    tbTss.secp256k1Key = tb.secp256k1Key;
    tbTss.ed25519Key = tb.ed25519Key;

    return tbTss;
  }

  toJSON(): StringifiedType {
    const tbJson = super.toJSON();
    tbJson.tssTag = this._tssTag;
    // tbJson.tssKeyType = this.tssKeyType;
    tbJson.accountSalt = this._accountSalt;
    tbJson.legacyMetadataFlag = this.legacyMetadataFlag;
    return tbJson;
  }

  async initialize(params?: TKeyInitArgs): Promise<KeyDetails> {
    if (this.serviceProvider.customAuthArgs.keyType === KeyType.ed25519 && !this.legacyMetadataFlag) {
      throw CoreError.default("legacyMetadataFlag need to be set for ed25519 network's postboxkey ");
    }
    return super.initialize(params);
  }

  /**
   * Initializes this instance. If a TSS account does not exist, creates one
   * under the given factor key. `skipTssInit` skips TSS account creation and
   * can be used with `importTssKey` to just import an existing account instead.
   */
  async initializeTssSecp256k1(params: Omit<TKeyTSSInitArgs, "tssKeyType">): Promise<void> {
    // only support service provider with secp256k1 key type
    if (this.serviceProvider.customAuthArgs.keyType === KeyType.ed25519) {
      throw CoreError.default("Multiple Curve do not support for ed25519 network's postboxkey ");
    }

    const secp256k1TssData = this.metadata.getTssData(KeyType.secp256k1, TSS_TAG_DEFAULT);
    const ed25519TssData = this.metadata.getTssData(KeyType.ed25519, TSS_TAG_DEFAULT);

    const secp256k1Exist = !!secp256k1TssData && Object.keys(secp256k1TssData).length > 0;
    const ed25519Exist = !!ed25519TssData && Object.keys(ed25519TssData).length > 0;

    const { deviceTSSShare, deviceTSSIndex, importKey, serverOpts } = params;
    let { factorPub } = params;
    if (secp256k1Exist) {
      throw CoreError.default("TSS account already exists for secp256k1 key type");
    }
    if (!serverOpts) {
      throw CoreError.default("serverOpts is required for import key flow");
    }
    if (ed25519Exist) {
      if (factorPub !== undefined || deviceTSSShare !== undefined || deviceTSSIndex !== undefined)
        throw CoreError.default("factorPub and deviceTSSIndex are not allowed when existing tss account exists");
      factorPub = ed25519TssData.factorPubs[0];
    } else if (!factorPub) {
      throw CoreError.default("factorPub is required");
    }

    const backupMetadata = this.metadata.clone();
    const localTssTag = TSS_TAG_DEFAULT;
    try {
      if (!importKey) {
        // if tss shares have not been created for this tssTag, create new tss sharing
        const { factorEncs, factorPubs, tssPolyCommits, tss2 } = await this._initializeNewTSSKey(
          KeyType.secp256k1,
          localTssTag,
          deviceTSSShare,
          factorPub,
          deviceTSSIndex
        );

        this.metadata.updateTSSData({ tssKeyType: KeyType.secp256k1, tssTag: localTssTag, tssNonce: 0, tssPolyCommits, factorPubs, factorEncs });

        const ecCurve = getEcCurve(KeyType.secp256k1);
        const accountSalt = generateSalt(ecCurve);
        await this._setTKeyStoreItem(TSS_MODULE, {
          id: "accountSalt",
          value: accountSalt,
        } as IAccountSaltStore);
        this._accountSalt = accountSalt;

        if (ed25519Exist) {
          const tssIndexes = ed25519TssData.factorPubs.map((point) => {
            return ed25519TssData.factorEncs[point.x.toString("hex", 64)].tssIndex;
          });
          // refresh with factorPubs
          this._refreshTSSSharesWithFactorPubs(
            {
              updateMetadata: false,
              tssShare: tss2,
              tssIndex: deviceTSSIndex ?? 2,
              factorPubs: ed25519TssData.factorPubs,
              tssIndexes,
              tssTag: localTssTag,
              keyType: KeyType.secp256k1,
            },
            serverOpts
          );
        }
      } else {
        let factorPubs = [factorPub];
        let newTSSIndexes = [params.deviceTSSIndex ?? 2];
        if (ed25519Exist) {
          // refresh with factorPubs
          factorPubs = ed25519TssData.factorPubs;
          newTSSIndexes = ed25519TssData.factorPubs.map((point) => {
            return ed25519TssData.factorEncs[point.x.toString("hex", 64)].tssIndex;
          });
        }

        await this.importTssKey(
          {
            tssTag: TSS_TAG_DEFAULT,
            importKey,
            factorPubs,
            newTSSIndexes,
            tssKeyType: KeyType.secp256k1,
          },
          params.serverOpts
        );
      }
      await this._syncShareMetadata();
    } catch (err) {
      // Error happend, restore metadata
      this.metadata = backupMetadata;
      throw err;
    }
  }

  /**
   * Initializes this instance. If a TSS account does not exist, creates one
   * under the given factor key. `skipTssInit` skips TSS account creation and
   * can be used with `importTssKey` to just import an existing account instead.
   */
  async initializeTssEd25519(params: Omit<TKeyTSSInitArgs, "tssKeyType"> & { importKey: Buffer }): Promise<void> {
    // only support service provider with secp256k1 key type
    if (this.serviceProvider.customAuthArgs.keyType === KeyType.ed25519) {
      if (this.metadata.getTssData(KeyType.ed25519, TSS_TAG_DEFAULT)) {
        throw CoreError.default("Multiple Curve do not support for postboxKey Ed");
      }
    }

    const { importKey } = params;
    if (!importKey) {
      throw CoreError.default("importKey is required");
    }

    const backupMetadata = this.metadata.clone();
    try {
      const secp256k1TssData = this.metadata.getTssData(KeyType.secp256k1, TSS_TAG_DEFAULT);
      const ed25519TssData = this.metadata.getTssData(KeyType.ed25519, TSS_TAG_DEFAULT);

      const secp256k1Exist = !!secp256k1TssData && Object.keys(secp256k1TssData).length > 0;
      const ed25519Exist = !!ed25519TssData && Object.keys(ed25519TssData).length > 0;

      const { factorPub, deviceTSSIndex, deviceTSSShare } = params;
      if (ed25519Exist) {
        throw CoreError.default("TSS account already exists for secp256k1 key type");
      }

      let factorPubs = [factorPub];
      let newTSSIndexes = [deviceTSSIndex ?? 2];

      // secp256k1Exist,
      if (secp256k1Exist) {
        // refresh with factorPubs
        if (factorPub !== undefined || deviceTSSIndex !== undefined || deviceTSSShare !== undefined)
          throw CoreError.default("factorPub and deviceTSSIndex are not allowed when existing tss account exists");
        factorPubs = secp256k1TssData.factorPubs;
        newTSSIndexes = secp256k1TssData.factorPubs.map((point) => {
          return secp256k1TssData.factorEncs[point.x.toString("hex", 64)].tssIndex;
        });
      }
      await this.importTssKey(
        {
          tssTag: TSS_TAG_DEFAULT,
          importKey,
          factorPubs,
          newTSSIndexes,
          tssKeyType: KeyType.ed25519,
        },
        params.serverOpts
      );
    } catch (err) {
      // Error happend, restore metadata
      this.metadata = backupMetadata;
      throw err;
    }
  }

  /**
   * Initializes a new TSS account under the given factor key.
   */
  async initializeTss(params: TKeyTSSInitArgs): Promise<void> {
    const { tssKeyType } = params;
    if (tssKeyType === KeyType.secp256k1) {
      await this.initializeTssSecp256k1(params);
    } else if (tssKeyType === KeyType.ed25519) {
      let { importKey } = params;
      if (!importKey) {
        // should we use randomValue for seed?
        const buf = new Uint32Array(32);
        crypto.getRandomValues(buf);
        importKey = Buffer.from(buf);
      }
      if (importKey) {
        await this.initializeTssEd25519({ ...params, importKey });
      } else {
        throw CoreError.default("importKey is required for ed25519 key type");
      }
    } else {
      throw CoreError.default("unsupported tssKeyType");
    }
  }

  /**
   * Returns the encrypted data associated with the given factor public key.
   */
  getFactorEncs(factorPub: Point, keyType: KeyType, tssTag: string = TSS_TAG_DEFAULT): FactorEnc {
    const localTssTag = tssTag;
    if (!this.metadata) throw CoreError.metadataUndefined();
    const tssData = this.metadata.getTssData(keyType, localTssTag);

    if (!tssData) throw CoreError.default("no factor encs mapping");

    const { factorPubs } = tssData;
    if (!factorPubs) throw CoreError.default(`no factor pubs for this tssTag ${localTssTag}`);
    if (factorPubs.filter((f) => f.x.cmp(factorPub.x) === 0 && f.y.cmp(factorPub.y) === 0).length === 0)
      throw CoreError.default(`factor pub ${factorPub} not found for tssTag ${localTssTag}`);
    if (!tssData.factorEncs) throw CoreError.default(`no factor encs for tssTag ${localTssTag}`);
    const factorPubID = factorPub.x.toString(16, 64);
    return tssData.factorEncs[factorPubID];
  }

  /**
   * Returns the TSS share associated with the given factor private key.
   */
  async getTSSShare(
    factorKey: BN,
    opts: {
      keyType: KeyType;
      tssTag: string;
      threshold?: number;
      accountIndex?: number;
      coefficient?: BN;
    }
  ): Promise<{
    tssIndex: number;
    tssShare: BN;
  }> {
    const factorPub = getPubKeyPoint(factorKey, factorKeyCurve);
    const localTssTag = opts.tssTag;

    const factorEncs = this.getFactorEncs(factorPub, opts.keyType, localTssTag);
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

    const ec = getKeyCurve(opts.keyType);
    const tssCommits = this.getTSSCommits(opts.keyType, localTssTag).map((p) => {
      return ec.keyFromPublic({ x: p.x.toString(16, 64), y: p.y.toString(16, 64) }).getPublic();
    });

    const userDec = tssShareBNs[0];

    const accountIndex = opts.accountIndex || 0;
    const coefficient = opts.coefficient || new BN(1);
    if (type === "direct") {
      const tssSharePub = ec.g.mul(userDec);
      const tssCommitA0 = tssCommits[0];
      const tssCommitA1 = tssCommits[1];
      const _tssSharePub = tssCommitA0.add(tssCommitA1.mul(new BN(tssIndex)));
      if (tssSharePub.eq(_tssSharePub)) {
        const adjustedShare = this.adjustTssShare({ share: userDec, accountIndex, coefficient, keyType: opts.keyType });
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
        const adjustedShare = this.adjustTssShare({ share: tssShare, accountIndex, coefficient, keyType: opts.keyType });
        return { tssIndex, tssShare: adjustedShare };
      }
    }
    throw new Error("could not find any combination of server decryptions that match tss commitments...");
  }

  /**
   * Returns the TSS public key and the curve points corresponding to secret key
   * shares, as stored in Metadata.
   */
  getTSSCommits(tssKeyType: KeyType, tssTag: string): Point[] {
    if (!this.metadata) throw CoreError.metadataUndefined();
    const localTssTag = tssTag;

    const tssData = this.metadata.getTssData(tssKeyType, localTssTag);
    if (!tssData) throw CoreError.default("no tss data");
    const { tssPolyCommits } = tssData;
    if (!tssPolyCommits) throw CoreError.default(`tss poly commits not found for tssTag ${localTssTag}`);
    if (tssPolyCommits.length === 0) throw CoreError.default("tss poly commits is empty");
    return tssPolyCommits;
  }

  /**
   * Returns the TSS public key.
   */
  getTSSPub(tssKeyType: KeyType, tssTag: string, accountIndex?: number): Point {
    const ec = getKeyCurve(tssKeyType);
    const tssCommits = this.getTSSCommits(tssKeyType, tssTag);
    if (accountIndex && accountIndex > 0) {
      // Add account nonce to pub key.
      const nonce = this.computeAccountNonce(accountIndex);
      const noncePub = ec.keyFromPrivate(nonce.toString("hex")).getPublic();
      const pubKeyPoint = tssCommits[0].toEllipticPoint(ec);
      const devicePubKeyPoint = pubKeyPoint.add(noncePub);
      return Point.fromElliptic(devicePubKeyPoint);
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
   * Imports an existing private key for threshold signing. A corresponding user
   * key share will be stored under the specified factor key.
   */
  async importTssKey(
    params: {
      tssTag: string;
      importKey: Buffer;
      factorPubs: Point[];
      newTSSIndexes: number[];
      tssKeyType: KeyType;
    },
    serverOpts: {
      selectedServers?: number[];
      authSignatures: string[];
    }
  ): Promise<void> {
    if (!this.secp256k1Key) throw CoreError.privateKeyUnavailable();
    if (!this.metadata) {
      throw CoreError.metadataUndefined();
    }

    const { importKey, factorPubs, newTSSIndexes, tssTag, tssKeyType } = params;

    const localTssTag = tssTag ?? TSS_TAG_DEFAULT;

    const tssData = this.metadata.getTssData(params.tssKeyType, localTssTag);
    if (tssData) {
      throw CoreError.default("TSS account already exists");
    }

    const ec = getKeyCurve(tssKeyType);

    const { selectedServers = [], authSignatures = [] } = serverOpts || {};

    if (!localTssTag) throw CoreError.default(`invalid param, tag is required`);
    if (!factorPubs || factorPubs.length === 0) throw CoreError.default(`invalid param, newFactorPub is required`);
    if (!newTSSIndexes || newTSSIndexes.length === 0) throw CoreError.default(`invalid param, newTSSIndex is required`);
    if (authSignatures.length === 0) throw CoreError.default(`invalid param, authSignatures is required`);

    // const existingFactorPubs = tssData.factorPubs;
    // if (existingFactorPubs?.length > 0) {
    //   throw CoreError.default(`Duplicate account tag, please use a unique tag for importing key`);
    // }

    const importScalar = await (async () => {
      if (tssKeyType === KeyType.secp256k1) {
        return new BN(importKey);
      } else if (tssKeyType === KeyType.ed25519) {
        // Store seed in metadata.
        const domainKey = getEd25519SeedStoreDomainKey(localTssTag);
        const result = this.metadata.getGeneralStoreDomain(domainKey) as Record<string, unknown>;
        if (result) {
          throw new Error("Seed already exists");
        }

        const { scalar } = getEd25519KeyPairFromSeed(importKey);
        const encKey = Buffer.from(getSecpKeyFromEd25519(scalar).point.encodeCompressed("hex"), "hex");
        const msg = await encrypt(encKey, importKey);
        this.metadata.setGeneralStoreDomain(domainKey, { message: msg });

        return scalar;
      }
      throw new Error("Invalid key type");
    })();

    if (!importScalar || importScalar.toString("hex") === "0") {
      throw new Error("Invalid importedKey");
    }

    const tssIndexes = newTSSIndexes;
    const existingNonce = tssData?.tssNonce ?? 0;
    const newTssNonce: number = existingNonce && existingNonce > 0 ? existingNonce + 1 : 0;
    const verifierAndVerifierID = this.serviceProvider.getVerifierNameVerifierId();
    const label = `${verifierAndVerifierID}\u0015${localTssTag}\u0016${newTssNonce}`;
    const tssPubKey = hexPoint(ec.g.mul(importScalar));
    const rssNodeDetails = await this._getRssNodeDetails();
    const { pubKey: newTSSServerPub, nodeIndexes } = await this.serviceProvider.getTSSPubKey(localTssTag, newTssNonce, tssKeyType);
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
      keyType: tssKeyType,
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
    const secondCommit = newTSSServerPub.toEllipticPoint(ec).add(ecPoint(ec, tssPubKey).neg());
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
    this.metadata.updateTSSData({
      tssKeyType,
      tssTag: localTssTag,
      tssNonce: newTssNonce,
      tssPolyCommits: newTSSCommits,
      factorPubs,
      factorEncs,
    });
    if (!this._accountSalt) {
      const accountSalt = generateSalt(getEcCurve(tssKeyType));
      await this._setTKeyStoreItem(TSS_MODULE, {
        id: "accountSalt",
        value: accountSalt,
      } as IAccountSaltStore);
      this._accountSalt = accountSalt;
    }
    await this._syncShareMetadata();
  }

  /**
   * UNSAFE: USE WITH CAUTION
   *
   * Reconstructs and exports the TSS private key. Secp256k1 only.
   */
  async _UNSAFE_exportTssKey(tssOptions: {
    factorKey: BN;
    selectedServers?: number[];
    authSignatures: string[];
    accountIndex?: number;
    keyType: KeyType;
    tssTag: string;
  }): Promise<BN> {
    const { factorKey, selectedServers, authSignatures, accountIndex, keyType, tssTag } = tssOptions;

    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.secp256k1Key) throw new Error("Tkey is not reconstructed");

    const tssData = this.metadata.getTssData(keyType, tssTag);
    if (!tssData?.tssPolyCommits?.length) throw new Error(`tss key has not been initialized for tssTag ${tssTag}`);

    const { tssIndex } = await this.getTSSShare(factorKey, { keyType, tssTag });
    // Assumption that there are only index 2 and 3 for tss shares
    // create complement index share
    const tempShareIndex = tssIndex === 2 ? 3 : 2;
    const tempFactorKey = factorKeyCurve.genKeyPair().getPrivate();
    const tempFactorPub = getPubKeyPoint(tempFactorKey, factorKeyCurve);

    await this.addFactorPub({
      existingFactorKey: factorKey,
      newFactorPub: tempFactorPub,
      newTSSIndex: tempShareIndex,
      authSignatures,
      selectedServers,
      refreshShares: true,
      tssTag,
    });

    const { tssShare: factorShare, tssIndex: factorIndex } = await this.getTSSShare(factorKey, { keyType, tssTag });
    const { tssShare: tempShare, tssIndex: tempIndex } = await this.getTSSShare(tempFactorKey, { keyType, tssTag });

    // reconstruct final key using sss
    const ec = getEcCurve(keyType);
    const tssKey = lagrangeInterpolation(ec, [tempShare, factorShare], [new BN(tempIndex), new BN(factorIndex)]);

    // delete created tss share
    await this.deleteFactorPub({
      factorKey,
      deleteFactorPub: tempFactorPub,
      authSignatures,
      selectedServers,
      tssTag,
    });

    // Derive key for account index.
    const nonce = this.computeAccountNonce(accountIndex);
    const derivedKey = tssKey.add(nonce).umod(ec.n);

    return derivedKey;
  }

  /**
   * UNSAFE: USE WITH CAUTION
   *
   * Reconstructs the TSS private key and exports the ed25519 private key seed.
   */
  async _UNSAFE_exportTssEd25519Seed(tssOptions: {
    factorKey: BN;
    selectedServers?: number[];
    authSignatures: string[];
    tssTag: string;
  }): Promise<Buffer> {
    const edScalar = await this._UNSAFE_exportTssKey({ ...tssOptions, keyType: KeyType.ed25519 });

    // Try to export ed25519 seed. This is only available if import key was being used.
    const domainKey = getEd25519SeedStoreDomainKey(tssOptions.tssTag);
    const result = this.metadata.getGeneralStoreDomain(domainKey) as Record<string, EncryptedMessage>;

    const decKey = getSecpKeyFromEd25519(edScalar).scalar;

    const seed = await decrypt(decKey.toArrayLike(Buffer, "be", 32), result.message);
    return seed;
  }

  // remote signer function

  /**
   * Refreshes TSS shares. Allows to change number of shares. New user shares are
   * only produced for the target indices.
   * @param factorPubs - Factor pub keys after refresh.
   * @param tssIndices - Target tss indices to generate new shares for.
   * @param remoteFactorPub - Factor Pub for remote share.
   * @param signatures - Signatures for authentication against RSS servers.
   */
  async remoteRefreshTssShares(params: {
    factorPubs: Point[];
    tssIndices: number[];
    remoteClient: IRemoteClientState;
    keyType: KeyType;
    tssTag: string;
  }) {
    const { factorPubs, tssIndices, remoteClient, keyType, tssTag } = params;
    const rssNodeDetails = await this._getRssNodeDetails();
    const { serverEndpoints, serverPubKeys, serverThreshold } = rssNodeDetails;
    let finalSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );
    const localTssTag = TSS_TAG_DEFAULT;
    const verifierNameVerifierId = this.serviceProvider.getVerifierNameVerifierId();
    const tssData = this.metadata.getTssData(keyType, localTssTag);
    if (!tssData) throw CoreError.default("no tss data");

    const tssCommits = tssData.tssPolyCommits;
    const tssNonce: number = tssData.tssNonce || 0;
    const { pubKey: newTSSServerPub, nodeIndexes } = await this.serviceProvider.getTSSPubKey(tssTag, tssNonce + 1, keyType);
    // move to pre-refresh
    if (nodeIndexes?.length > 0) {
      finalSelectedServers = nodeIndexes.slice(0, Math.min(serverEndpoints.length, nodeIndexes.length));
    }

    const factorEnc = this.getFactorEncs(Point.fromSEC1(secp256k1, remoteClient.remoteFactorPub), keyType, localTssTag);

    const dataRequired: RefreshRemoteTssParams = {
      factorEnc,
      factorPubs: factorPubs.map((pub) => pub.toPointHex()),
      targetIndexes: tssIndices,
      verifierNameVerifierId,
      tssTag: TSS_TAG_DEFAULT,
      tssCommits: tssCommits.map((commit) => commit.toPointHex()),
      tssNonce,
      newTSSServerPub: newTSSServerPub.toPointHex(),
      serverOpts: {
        selectedServers: finalSelectedServers,
        serverEndpoints,
        serverPubKeys,
        serverThreshold,
        authSignatures: remoteClient.signatures,
      },
      curve: keyType,
    };

    const result = (
      await post<{ data: RefreshRemoteTssReturnType }>(
        `${remoteClient.remoteClientUrl}/api/v3/mpc/refresh_tss`,
        { dataRequired },
        {
          headers: {
            Authorization: `Bearer ${remoteClient.remoteClientToken}`,
          },
        }
      )
    ).data;

    this.metadata.updateTSSData({
      tssTag: result.tssTag,
      tssNonce: result.tssNonce,
      tssPolyCommits: result.tssPolyCommits.map((commit) => Point.fromJSON(commit)),
      factorPubs: result.factorPubs.map((pub) => Point.fromJSON(pub)),
      factorEncs: result.factorEncs,
    });
  }

  async remoteAddFactorPub(params: {
    newFactorPub: Point;
    newFactorTSSIndex: number;
    remoteClient: IRemoteClientState;
    keyType: KeyType;
    tssTag: string;
  }) {
    const { newFactorPub, newFactorTSSIndex, remoteClient, keyType, tssTag } = params;
    // const ed25519TssMetadata = this.metadata.getTssData(KeyType.ed25519);
    const localTssTag = TSS_TAG_DEFAULT;
    const secp256k1TssMetadata = this.metadata.getTssData(KeyType.secp256k1, localTssTag);
    const existingFactorPubs = secp256k1TssMetadata.factorPubs;
    const updatedFactorPubs = existingFactorPubs.concat([newFactorPub]);
    const existingTSSIndexes = existingFactorPubs.map((fb) => this.getFactorEncs(fb, keyType, localTssTag).tssIndex);
    const updatedTSSIndexes = existingTSSIndexes.concat([newFactorTSSIndex]);

    await this.remoteRefreshTssShares({
      factorPubs: updatedFactorPubs,
      tssIndices: updatedTSSIndexes,
      remoteClient,
      keyType,
      tssTag,
    });
  }

  async remoteDeleteFactorPub(params: { factorPubToDelete: Point; remoteClient: IRemoteClientState; keyType: KeyType; tssTag: string }) {
    const { factorPubToDelete, remoteClient, keyType, tssTag } = params;
    const tssData = this.metadata.getTssData(keyType, tssTag);
    const existingFactorPubs = tssData.factorPubs;
    const factorIndex = existingFactorPubs.findIndex((p) => p.x.eq(factorPubToDelete.x));
    if (factorIndex === -1) {
      throw new Error(`factorPub ${factorPubToDelete} does not exist`);
    }
    const updatedFactorPubs = existingFactorPubs.slice();
    updatedFactorPubs.splice(factorIndex, 1);
    const updatedTSSIndexes = updatedFactorPubs.map((fb) => this.getFactorEncs(fb, keyType, tssTag).tssIndex);

    await this.remoteRefreshTssShares({
      factorPubs: updatedFactorPubs,
      tssIndices: updatedTSSIndexes,
      remoteClient,
      keyType,
      tssTag,
    });
  }

  async remoteCopyFactorPub(params: { newFactorPub: Point; tssIndex: number; remoteClient: IRemoteClientState; keyType: KeyType }) {
    const { newFactorPub, tssIndex, remoteClient, keyType } = params;
    const remoteFactorPub = Point.fromSEC1(secp256k1, remoteClient.remoteFactorPub);
    const localTssTag = TSS_TAG_DEFAULT;
    const factorEnc = this.getFactorEncs(remoteFactorPub, keyType, localTssTag);
    const tssCommits = this.getTSSCommits(keyType, localTssTag).map((commit) => commit.toPointHex());
    const dataRequired: CopyRemoteTssParams = {
      factorEnc,
      tssCommits,
      factorPub: newFactorPub.toPointHex(),
      curve: keyType,
    };

    const result = (
      await post<{ data?: EncryptedMessage }>(
        `${remoteClient.remoteClientUrl}/api/v3/mpc/copy_tss_share`,
        { dataRequired },
        {
          headers: {
            Authorization: `Bearer ${remoteClient.remoteClientToken}`,
          },
        }
      )
    ).data;

    const tssData = this.metadata.getTssData(keyType, localTssTag);

    const updatedFactorPubs = tssData.factorPubs.concat([newFactorPub]);
    const factorEncs: { [key: string]: FactorEnc } = JSON.parse(JSON.stringify(tssData.factorEncs));
    const factorPubID = newFactorPub.x.toString(16, 64);
    factorEncs[factorPubID] = {
      tssIndex,
      type: "direct",
      userEnc: result,
      serverEncs: [],
    };
    this.metadata.updateTSSData({
      tssTag: localTssTag,
      factorPubs: updatedFactorPubs,
      factorEncs,
    });
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
      keyType: KeyType;
    },
    tssTag: string
  ): Promise<void> {
    if (!this.metadata) throw CoreError.metadataUndefined();
    const { keyType } = serverOpts;
    const localTssTag = tssTag ?? TSS_TAG_DEFAULT;
    const tssData = this.metadata.getTssData(keyType, localTssTag);

    const tssCommits = tssData?.tssPolyCommits;
    if (!tssCommits) throw CoreError.default(`tss commits not found for tssTag ${localTssTag}`);
    if (tssCommits.length === 0) throw CoreError.default(`tssCommits is empty`);
    const tssPubKeyPoint = tssCommits[0];
    const tssPubKey = pointToHex(tssPubKeyPoint);
    const { serverEndpoints, serverPubKeys, serverThreshold, selectedServers, authSignatures } = serverOpts;

    const rssClient = new RSSClient({
      serverEndpoints,
      serverPubKeys,
      serverThreshold,
      tssPubKey,
      keyType,
    });

    if (!tssData.factorPubs) throw CoreError.default(`factorPubs obj not found`);
    if (!factorPubs) throw CoreError.default(`factorPubs not found for tssTag ${localTssTag}`);
    if (factorPubs.length === 0) throw CoreError.default(`factorPubs is empty`);

    if (tssData.tssNonce === undefined) throw CoreError.default(`tssNonces obj not found`);
    const tssNonce: number = tssData.tssNonce || 0;

    const oldLabel = `${verifierNameVerifierId}\u0015${localTssTag}\u0016${tssNonce}`;
    const newLabel = `${verifierNameVerifierId}\u0015${localTssTag}\u0016${tssNonce + 1}`;

    const { pubKey: newTSSServerPub, nodeIndexes } = await this.serviceProvider.getTSSPubKey(localTssTag, tssNonce + 1, keyType);
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

    const ecCurve = getKeyCurve(keyType);
    const secondCommit = newTSSServerPub.toEllipticPoint(ecCurve).add(ecPoint(ecCurve, tssPubKey).neg());
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

    this.metadata.updateTSSData({
      tssKeyType: keyType,
      tssTag: localTssTag,
      tssNonce: tssNonce + 1,
      tssPolyCommits: newTSSCommits,
      factorPubs,
      factorEncs,
    });
    if (updateMetadata) await this._syncShareMetadata();
  }

  async _refreshTSSSharesWithFactorPubs(
    params: { updateMetadata: boolean; tssShare: BN; tssIndex: number; factorPubs: Point[]; tssIndexes: number[]; tssTag: string; keyType: KeyType },
    serverOpts: {
      selectedServers?: number[];
      authSignatures: string[];
    }
  ) {
    const { factorPubs, tssIndexes, tssShare, tssIndex, tssTag, keyType } = params;
    const { selectedServers, authSignatures } = serverOpts;

    const verifierId = this.serviceProvider.getVerifierNameVerifierId();
    const rssNodeDetails = await this._getRssNodeDetails();
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );

    const finalServer = selectedServers || randomSelectedServers;

    // sync metadata by default
    // create a localMetadataTransition if manual sync
    const updateMetadata = params.updateMetadata === undefined ? true : params.updateMetadata;

    await this._refreshTSSShares(
      updateMetadata,
      tssShare,
      tssIndex,
      factorPubs,
      tssIndexes,
      verifierId,
      {
        ...rssNodeDetails,
        selectedServers: finalServer,
        authSignatures,
        keyType,
      },
      tssTag ?? TSS_TAG_DEFAULT
    );
  }

  /**
   * Derives the account nonce for the specified account index.
   */
  computeAccountNonce(index?: number): BN {
    if (!index || index === 0) {
      return new BN(0);
    }

    const ec = getKeyCurve(KeyType.secp256k1);

    // generation should occur during tkey.init, fails if accountSalt is absent
    if (!this._accountSalt) {
      throw Error("account salt undefined");
    }
    let accountHash = keccak256(Buffer.from(`${index}${this._accountSalt}`));
    if (accountHash.length === 66) accountHash = accountHash.slice(2);
    return new BN(accountHash, "hex").umod(ec.n);
  }

  /**
   * Reconstructs the TKey and finalize intialization.
   */
  async reconstructKey(_reconstructKeyMiddleware?: boolean): Promise<ReconstructedKeyResult> {
    const k = await super.reconstructKey(_reconstructKeyMiddleware);

    const accountSalt = (await this.getTKeyStoreItem(TSS_MODULE, "accountSalt")) as IAccountSaltStore;
    if (accountSalt && accountSalt.value) {
      this._accountSalt = accountSalt.value;
    } else {
      const newSalt = generateSalt(getKeyCurve(KeyType.secp256k1));
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

    return k;
  }

  public async addFactorPub(args: {
    existingFactorKey: BN;
    newFactorPub: Point;
    newTSSIndex: number;
    selectedServers?: number[];
    authSignatures: string[];
    refreshShares?: boolean;
    updateMetadata?: boolean;
    tssTag: string;
  }) {
    const secp256k1Data = this.metadata.getTssData(KeyType.secp256k1, args.tssTag);
    const ed25519Data = this.metadata.getTssData(KeyType.ed25519, args.tssTag);

    const allPromise = [];

    if (secp256k1Data) {
      allPromise.push(this._addFactorPub({ ...args, keyType: KeyType.secp256k1 }));
    }
    if (ed25519Data) {
      allPromise.push(this._addFactorPub({ ...args, keyType: KeyType.ed25519 }));
    }

    await Promise.all(allPromise);
  }

  /**
   * Adds a factor key to the set of authorized keys.
   *
   * `refreshShares` - If this is true, then refresh the shares. If this is
   * false, `newTSSIndex` must be the same as current factor key index.
   */
  public async _addFactorPub(args: {
    existingFactorKey: BN;
    newFactorPub: Point;
    newTSSIndex: number;
    selectedServers?: number[];
    authSignatures: string[];
    refreshShares?: boolean;
    updateMetadata?: boolean;
    keyType: KeyType;
    tssTag: string;
  }) {
    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.secp256k1Key) throw new Error("Tkey is not reconstructed");
    const { existingFactorKey, newFactorPub, newTSSIndex, selectedServers, authSignatures, refreshShares, keyType, tssTag } = args;
    const tssData = this.metadata.getTssData(keyType, tssTag);

    const { tssShare, tssIndex } = await this.getTSSShare(existingFactorKey, { keyType, tssTag });

    if (tssIndex !== newTSSIndex && !refreshShares) {
      throw CoreError.default("newTSSIndex does not match existing tssIndex, set refreshShares to true to refresh shares");
    }
    const localTssTag = tssTag ?? TSS_TAG_DEFAULT;

    if (!refreshShares) {
      // Just copy data stored under factor key.
      if (tssIndex !== newTSSIndex) {
        throw CoreError.default("newTSSIndex does not match existing tssIndex, set refreshShares to true to refresh shares");
      }

      const updatedFactorPubs = tssData.factorPubs.concat([newFactorPub]);
      const factorEncs = JSON.parse(JSON.stringify(tssData.factorEncs));
      const factorPubID = newFactorPub.x.toString(16, 64);
      factorEncs[factorPubID] = {
        tssIndex,
        type: "direct",
        userEnc: await encrypt(newFactorPub.toSEC1(secp256k1, false), tssShare.toArrayLike(Buffer, "be", 32)),
        serverEncs: [],
      };

      this.metadata.updateTSSData({
        tssKeyType: args.keyType,
        tssTag: localTssTag,
        factorPubs: updatedFactorPubs,
        factorEncs,
      });
    } else {
      // Use RSS to create new TSS share and store it under new factor key.
      const existingFactorPubs = tssData.factorPubs;
      const updatedFactorPubs = existingFactorPubs.concat([newFactorPub]);

      const verifierId = this.serviceProvider.getVerifierNameVerifierId();
      const rssNodeDetails = await this._getRssNodeDetails();
      const randomSelectedServers = randomSelection(
        new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
        Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
      );

      const finalServer = selectedServers || randomSelectedServers;

      const existingTSSIndexes = existingFactorPubs.map((fb) => this.getFactorEncs(fb, keyType, localTssTag).tssIndex);
      const updatedTSSIndexes = existingTSSIndexes.concat([newTSSIndex]);

      // sync metadata by default
      // create a localMetadataTransition if manual sync
      const updateMetadata = args.updateMetadata !== undefined ? args.updateMetadata : true;

      await this._refreshTSSShares(
        updateMetadata,
        tssShare,
        tssIndex,
        updatedFactorPubs,
        updatedTSSIndexes,
        verifierId,
        {
          ...rssNodeDetails,
          selectedServers: finalServer,
          authSignatures,
          keyType,
        },
        localTssTag
      );
    }
  }

  public async deleteFactorPub(args: {
    tssTag: string;
    factorKey: BN;
    deleteFactorPub: Point;
    selectedServers?: number[];
    authSignatures: string[];
    updateMetadata?: boolean;
  }): Promise<void> {
    const { updateMetadata, ...otherArgs } = args;
    const allPromise = [];
    if (this.metadata.getTssData(KeyType.secp256k1, args.tssTag))
      allPromise.push(this._deleteFactorPub({ ...otherArgs, keyType: KeyType.secp256k1 }));
    if (this.metadata.getTssData(KeyType.ed25519, args.tssTag)) allPromise.push(this._deleteFactorPub({ ...otherArgs, keyType: KeyType.ed25519 }));
    await Promise.all(allPromise);
    if (updateMetadata) await this._syncShareMetadata();
  }

  /**
   * Removes a factor key from the set of authorized keys and refreshes the TSS
   * key shares.
   */
  public async _deleteFactorPub(args: {
    factorKey: BN;
    deleteFactorPub: Point;
    selectedServers?: number[];
    authSignatures: string[];
    updateMetadata?: boolean;
    keyType: KeyType;
    tssTag: string;
  }): Promise<void> {
    if (!this.metadata) throw CoreError.metadataUndefined("metadata is undefined");
    if (!this.secp256k1Key) throw new Error("Tkey is not reconstructed");
    const { factorKey, deleteFactorPub, selectedServers, authSignatures, keyType, tssTag } = args;

    const tssData = this.metadata.getTssData(keyType, tssTag);
    const existingFactorPubs = tssData.factorPubs;
    const { tssShare, tssIndex } = await this.getTSSShare(factorKey, { keyType, tssTag });

    const found = existingFactorPubs.filter((f) => f.x.eq(deleteFactorPub.x) && f.y.eq(deleteFactorPub.y));
    if (found.length === 0) throw CoreError.default("could not find factorPub to delete");
    if (found.length > 1) throw CoreError.default("found two or more factorPubs that match, error in metadata");
    const updatedFactorPubs = existingFactorPubs.filter((f) => !f.x.eq(deleteFactorPub.x) || !f.y.eq(deleteFactorPub.y));

    this.metadata.updateTSSData({ tssKeyType: keyType, tssTag, factorPubs: updatedFactorPubs });
    const rssNodeDetails = await this._getRssNodeDetails();
    const randomSelectedServers = randomSelection(
      new Array(rssNodeDetails.serverEndpoints.length).fill(null).map((_, i) => i + 1),
      Math.ceil(rssNodeDetails.serverEndpoints.length / 2)
    );
    const finalServer = selectedServers || randomSelectedServers;
    const updatedTSSIndexes = updatedFactorPubs.map((fb) => this.getFactorEncs(fb, keyType, tssTag).tssIndex);

    const updateMetadata = args.updateMetadata !== undefined ? args.updateMetadata : true;

    await this._refreshTSSShares(
      updateMetadata,
      tssShare,
      tssIndex,
      updatedFactorPubs,
      updatedTSSIndexes,
      this.serviceProvider.getVerifierNameVerifierId(),
      {
        ...rssNodeDetails,
        selectedServers: finalServer,
        authSignatures,
        keyType,
      },
      tssTag
    );
  }

  /**
   * Adjusts a TSS key share based on account index and share coefficient.
   */
  protected adjustTssShare(args: { share: BN; accountIndex: number; coefficient: BN; keyType: KeyType }): BN {
    const { share, accountIndex, coefficient, keyType } = args;
    const nonce = this.computeAccountNonce(accountIndex);
    return share.mul(coefficient).add(nonce).umod(getKeyCurve(keyType).n);
  }

  /**
   * Initializes a new TSS key under the specified factor key and using the
   * provided user share.
   */
  protected async _initializeNewTSSKey(
    keyType: KeyType,
    tssTag: string,
    deviceTSSShare: BN,
    factorPub: Point,
    deviceTSSIndex?: number
  ): Promise<InitializeNewTSSKeyResult> {
    const localEc = getKeyCurve(keyType);
    let tss2: BN;
    const _tssIndex = deviceTSSIndex || 2; // TODO: fix
    if (deviceTSSShare) {
      tss2 = deviceTSSShare;
    } else {
      tss2 = localEc.genKeyPair().getPrivate();
    }
    const { pubKey: tss1Pub } = await this.serviceProvider.getTSSPubKey(tssTag, 0, keyType);
    const tss1PubKey = tss1Pub.toEllipticPoint(localEc);
    const tss2PubKey = (localEc.g as EllipticPoint).mul(tss2);

    const L1_0 = getLagrangeCoeffs(localEc, [1, _tssIndex], 1, 0);

    const LIndex_0 = getLagrangeCoeffs(localEc, [1, _tssIndex], _tssIndex, 0);

    const a0Pub = tss1PubKey.mul(L1_0).add(tss2PubKey.mul(LIndex_0));
    const a1Pub = tss1PubKey.add(a0Pub.neg());

    const tssPolyCommits = [Point.fromElliptic(a0Pub), Point.fromElliptic(a1Pub)];
    const factorPubs = [factorPub];
    const factorEncs: { [factorPubID: string]: FactorEnc } = {};

    for (let i = 0; i < factorPubs.length; i++) {
      const f = factorPubs[i];
      const factorPubID = f.x.toString(16, 64);
      factorEncs[factorPubID] = {
        tssIndex: _tssIndex,
        type: "direct",
        userEnc: await encrypt(f.toSEC1(factorKeyCurve, false), Buffer.from(tss2.toString(16, 64), "hex")),
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
