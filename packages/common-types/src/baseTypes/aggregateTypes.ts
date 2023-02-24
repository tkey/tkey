import type { CustomAuthArgs } from "@toruslabs/customauth";
import { PointHex } from "@toruslabs/rss-client";
import BN from "bn.js";

import {
  Point,
  Polynomial,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  Share,
  ShareMap,
  ShareStore,
  ShareStoreMap,
  ShareStorePolyIDShareIndexMap,
} from "../base";
import {
  BNString,
  EncryptedMessage,
  FactorEnc,
  ISerializable,
  IServiceProvider,
  IStorageLayer,
  PolyIDAndShares,
  PolynomialID,
  ShareDescriptionMap,
} from "./commonTypes";

export interface IModule {
  moduleName: string;
  // eslint-disable-next-line no-use-before-define
  setModuleReferences(api: ITKeyApi): void;
  // called to initialize a module on the main TBSDK.
  // currenty called immediately after the base metadata has been set on the SDK
  initialize(): Promise<void>;
}

// @flow

export type ModuleMap = {
  [moduleName: string]: IModule;
};

export type RefreshMiddlewareMap = {
  [moduleName: string]: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown;
};

export type ReconstructKeyMiddlewareMap = {
  [moduleName: string]: () => Promise<BN[]>;
};

export type ShareSerializationMiddleware = {
  serialize: (share: BN, type: string) => Promise<unknown>;
  deserialize: (serializedShare: unknown, type: string) => Promise<BN>;
};

export interface IMetadata extends ISerializable {
  pubKey: Point;

  publicPolynomials: PublicPolynomialMap;

  publicShares: PublicSharePolyIDShareIndexMap;

  polyIDList: PolyIDAndShares[];

  generalStore: {
    [moduleName: string]: unknown;
  };

  tkeyStore: {
    [moduleName: string]: unknown;
  };

  scopedStore: {
    [moduleName: string]: unknown;
  };

  nonce: number;

  getShareIndexesForPolynomial(polyID: PolynomialID): string[];
  getLatestPublicPolynomial(): PublicPolynomial;
  addTSSData(tssData: {
    tssTag?: string;
    tssNonce?: number;
    tssPolyCommits?: Point[];
    factorPubs?: Point[];
    factorEncs?: {
      [factorPubID: string]: FactorEnc;
    };
  }): void;
  addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
  setGeneralStoreDomain(key: string, obj: unknown): void;
  getGeneralStoreDomain(key: string): unknown;
  deleteGeneralStoreDomain(key: string): unknown;
  setTkeyStoreDomain(key: string, arr: unknown): void;
  getTkeyStoreDomain(key: string): unknown;
  addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void;
  setScopedStore(domain: string, data: unknown): void;
  getEncryptedShare(shareStore: ShareStore): Promise<ShareStore>;
  getShareDescription(): ShareDescriptionMap;
  shareToShareStore(share: BN): ShareStore;
  addShareDescription(shareIndex: string, description: string): void;
  deleteShareDescription(shareIndex: string, description: string): void;
  updateShareDescription(shareIndex: string, oldDescription: string, newDescription: string): void;
  clone(): IMetadata;
}

export type InitializeNewKeyResult = {
  privKey: BN;
  deviceShare?: ShareStore;
  userShare?: ShareStore;
};

export type ReconstructedKeyResult = {
  privKey: BN;
  seedPhrase?: BN[];
  allKeys?: BN[];
};

export type CatchupToLatestShareResult = {
  latestShare: ShareStore;
  shareMetadata: IMetadata;
};

export type GenerateNewShareResult = {
  newShareStores: ShareStoreMap;
  newShareIndex: BN;
};

export type DeleteShareResult = {
  newShareStores: ShareStoreMap;
};

export type RefreshSharesResult = {
  shareStores: ShareStoreMap;
};

export type KeyDetails = {
  pubKey: Point;
  requiredShares: number;
  threshold: number;
  totalShares: number;
  shareDescriptions: ShareDescriptionMap;
};

export type TKeyArgs = {
  enableLogging?: boolean;
  modules?: ModuleMap;
  serviceProvider?: IServiceProvider;
  storageLayer?: IStorageLayer;
  customAuthArgs?: CustomAuthArgs;
  manualSync?: boolean;
  serverTimeOffset?: number;
  tssTag?: string;
};

export interface SecurityQuestionStoreArgs {
  nonce: BNString;

  shareIndex: BNString;

  sqPublicShare: PublicShare;

  polynomialID: PolynomialID;

  questions: string;
}

export interface TkeyStoreDataArgs {
  [key: string]: unknown;
}

export interface TkeyStoreArgs {
  data: TkeyStoreDataArgs;
}

export interface ShareTransferStorePointerArgs {
  pointer: BNString;
}

export type BufferObj = {
  type: string;
  data: number[];
};

export interface ShareRequestArgs {
  encPubKey: unknown;
  encShareInTransit: EncryptedMessage;
  availableShareIndexes: string[];
  userAgent: string;
  userIp: string;
  timestamp: number;
}

export type TkeyStoreItemType = {
  id: string;
};

export type ISeedPhraseStore = TkeyStoreItemType & {
  seedPhrase: string;
  type: string;
};

export type ISQAnswerStore = TkeyStoreItemType & {
  answer: string;
};

export type ISeedPhraseStoreWithKeys = ISeedPhraseStore & {
  keys: BN[];
};

export type MetamaskSeedPhraseStore = ISeedPhraseStore & {
  numberOfWallets: number;
};

export type IPrivateKeyStore = TkeyStoreItemType & {
  privateKey: BN;
  type: string;
};

export interface ISeedPhraseFormat {
  type: string;
  validateSeedPhrase(seedPhrase: string): boolean;
  deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Promise<BN[]>;
  createSeedPhraseStore(seedPhrase?: string): Promise<ISeedPhraseStore>;
}

export interface IPrivateKeyFormat {
  privateKey: BN;
  type: string;
  validatePrivateKey(privateKey: BN): boolean;
  createPrivateKeyStore(privateKey: BN): IPrivateKeyStore;
}

export interface IAuthMetadata {
  metadata: IMetadata;
  privKey?: BN;
}

export interface IMessageMetadata {
  message: string;
  dateAdded?: number;
}

export type IAuthMetadatas = IAuthMetadata[];
export type ShareStores = ShareStore[];
export type IMessageMetadatas = IMessageMetadata[];
export type LocalTransitionShares = BN[];
export type LocalTransitionData = [...IAuthMetadatas, ...ShareStores, ...IMessageMetadatas];
export type LocalMetadataTransitions = [LocalTransitionShares, LocalTransitionData];

export interface ITKeyApi {
  getMetadata(): IMetadata;
  getStorageLayer(): IStorageLayer;
  initialize(params: { input?: ShareStore; importKey?: BN; neverInitializeNewKey?: boolean }): Promise<KeyDetails>;
  catchupToLatestShare(params: {
    shareStore: ShareStore;
    polyID?: string;
    includeLocalMetadataTransitions?: boolean;
  }): Promise<CatchupToLatestShareResult>;
  _syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
  inputShareStoreSafe(shareStore: ShareStore, autoUpdateMetadata?: boolean): Promise<void>;
  _setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
  addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
  _addRefreshMiddleware(
    moduleName: string,
    middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown
  ): void;
  _addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
  _addShareSerializationMiddleware(
    serialize: (share: BN, type: string) => Promise<unknown>,
    deserialize: (serializedShare: unknown, type: string) => Promise<BN>
  ): void;
  generateNewShare(
    useTSS?: boolean,
    tssOptions?: {
      inputTSSShare: BN;
      inputTSSIndex: number;
      newFactorPub: Point;
      newTSSIndex: number;
      selectedServers?: number[];
    }
  ): Promise<GenerateNewShareResult>;
  outputShareStore(shareIndex: BNString, polyID?: string): ShareStore;
  inputShare(share: unknown, type?: string): Promise<void>;
  outputShare(shareIndex: BNString, type?: string): Promise<unknown>;
  inputShareStore(shareStore: ShareStore): void;
  deleteShare(shareIndex: BNString, useTSS?: boolean): Promise<DeleteShareResult>;
  encrypt(data: Buffer): Promise<EncryptedMessage>;
  decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;

  getTKeyStoreItem(moduleName: string, id: string): Promise<TkeyStoreItemType>;
  getTKeyStore(moduleName: string): Promise<TkeyStoreItemType[]>;
  _deleteTKeyStoreItem(moduleName: string, id: string): Promise<void>;
  _setTKeyStoreItem(moduleName: string, data: TkeyStoreItemType, updateMetadata?: boolean): Promise<void>;
}

export interface ITKey extends ITKeyApi, ISerializable {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  _localMetadataTransitions: LocalMetadataTransitions;

  manualSync: boolean;

  _refreshMiddleware: RefreshMiddlewareMap;

  _reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;

  _shareSerializationMiddleware: ShareSerializationMiddleware;

  initialize(params: { input?: ShareStore; importKey?: BN; neverInitializeNewKey?: boolean }): Promise<KeyDetails>;

  reconstructKey(): Promise<ReconstructedKeyResult>;

  reconstructLatestPoly(): Polynomial;

  _getTSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }>;

  _refreshTSSShares(
    updateMetadata: boolean,
    deviceTSSShare: BN,
    deviceTSSIndex: number,
    factorPubs: Point[],
    targetIndexes: number[],
    vid: string,
    serverOpts: {
      serverEndpoints: string[];
      serverPubKeys: PointHex[];
      serverThreshold: number;
      selectedServers: number[];
    }
  ): Promise<void>;

  _refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;

  _initializeNewKey(params: { userInput?: BN; initializeModules?: boolean }): Promise<InitializeNewKeyResult>;

  _setKey(privKey: BN): void;

  getKeyDetails(): KeyDetails;
}
