import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
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
  addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
  setGeneralStoreDomain(key: string, obj: unknown): void;
  getGeneralStoreDomain(key: string): unknown;
  setTkeyStoreDomain(key: string, arr: unknown): void;
  getTkeyStoreDomain(key: string): unknown;
  addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void;
  setScopedStore(domain: string, data: unknown): void;
  getEncryptedShare(shareStore: ShareStore): Promise<ShareStore>;
  getShareDescription(): ShareDescriptionMap;
  shareToShareStore(share: BN): ShareStore;
  addShareDescription(shareIndex: string, description: string): void;
  deleteShareDescription(shareIndex: string, description: string): void;
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
  directParams?: DirectWebSDKArgs;
  manualSync?: boolean;
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

export type SECP256k1NStore = IPrivateKeyStore;

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
  createPrivateKeyStore(privateKey: BN): SECP256k1NStore;
}

export interface ITKeyApi {
  getMetadata(): IMetadata;
  getStorageLayer(): IStorageLayer;
  initialize(params: { input?: ShareStore; importKey?: BN; neverInitializeNewKey?: boolean }): Promise<KeyDetails>;
  catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;
  syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
  inputShareStoreSafe(shareStore: ShareStore): Promise<void>;
  setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
  addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
  inputShareStore(shareStore: ShareStore): void;
  deleteShare(shareIndex: BNString): Promise<DeleteShareResult>;
  addRefreshMiddleware(
    moduleName: string,
    middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown
  ): void;
  addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
  addShareSerializationMiddleware(
    serialize: (share: BN, type: string) => Promise<unknown>,
    deserialize: (serializedShare: unknown, type: string) => Promise<BN>
  ): void;
  generateNewShare(): Promise<GenerateNewShareResult>;
  outputShareStore(shareIndex: BNString, polyID?: string): ShareStore;
  inputShare(share: unknown, type?: string): Promise<void>;
  outputShare(shareIndex: BNString, type?: string): Promise<unknown>;
  encrypt(data: Buffer): Promise<EncryptedMessage>;
  decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;

  getTKeyStoreItem(moduleName: string, id: string): Promise<TkeyStoreItemType>;
  getTKeyStore(moduleName: string): Promise<TkeyStoreItemType[]>;
  deleteTKeyStoreItem(moduleName: string, id: string): Promise<void>;
  setTKeyStoreItem(moduleName: string, data: TkeyStoreItemType, updateMetadata?: boolean): Promise<void>;
}

// eslint-disable-next-line no-use-before-define
export interface ITKey extends ITKeyApi, ISerializable {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  metadataToSet: any[];

  manualSync: boolean;

  refreshMiddleware: RefreshMiddlewareMap;

  reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;

  shareSerializationMiddleware: ShareSerializationMiddleware;

  initialize(params: { input?: ShareStore; importKey?: BN; neverInitializeNewKey?: boolean }): Promise<KeyDetails>;

  reconstructKey(): Promise<ReconstructedKeyResult>;

  reconstructLatestPoly(): Polynomial;

  refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;

  initializeNewKey(params: { userInput?: BN; initializeModules?: boolean }): Promise<InitializeNewKeyResult>;

  setKey(privKey: BN): void;

  getKeyDetails(): KeyDetails;
}
