import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

import {
  Point,
  Polynomial,
  PublicPolynomial,
  PublicPolynomialMap,
  PublicShare,
  PublicSharePolyIDShareIndexMap,
  ScopedStore,
  Share,
  ShareMap,
  ShareStore,
  ShareStoreMap,
  ShareStorePolyIDShareIndexMap,
} from "../base";
import { BNString, EncryptedMessage, ISerializable, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";

export interface IModule {
  moduleName: string;
  // eslint-disable-next-line no-use-before-define
  setModuleReferences(api: ITKeyApi): void;
  // called to initialize a module on the main TBSDK.
  // currenty called immedietly after the base metadata has been set on the SDK
  // eslint-disable-next-line no-use-before-define
  initialize(): Promise<void>;
}

// @flow

export type ModuleMap = {
  [moduleName: string]: IModule;
};

export type RefreshMiddlewareMap = {
  [moduleName: string]: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown;
};

export interface IMetadata extends ISerializable {
  pubKey: Point;

  publicPolynomials: PublicPolynomialMap;

  publicShares: PublicSharePolyIDShareIndexMap;

  shareDescriptions: ShareDescriptionMap;

  polyIDList: PolynomialID[];

  generalStore: {
    [moduleName: string]: unknown;
  };

  scopedStore: ScopedStore;

  getShareIndexesForPolynomial(polyID: PolynomialID): Array<string>;
  getLatestPublicPolynomial(): PublicPolynomial;
  addPublicPolynomial(publicPolynomial: PublicPolynomial): void;
  addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
  setGeneralStoreDomain(key: string, obj: unknown): void;
  getGeneralStoreDomain(key: string): unknown;
  addFromPolynomialAndShares(polynomial: Polynomial, shares: Array<Share> | ShareMap): void;
  setScopedStore(scopedStore: ScopedStore): void;
  getEncryptedShare(): ShareStore;
  getShareDescription(): ShareDescriptionMap;
  addShareDescription(shareIndex: string, description: string): void;
  deleteShareDescription(shareIndex: string, description: string): void;
  clone(): IMetadata;
}

export type InitializeNewKeyResult = {
  privKey: BN;
  deviceShare?: ShareStore;
  userShare?: ShareStore;
};

export type CatchupToLatestShareResult = {
  latestShare: ShareStore;
  shareMetadata: IMetadata;
};

export type GenerateNewShareResult = {
  newShareStores: ShareStoreMap;
  newShareIndex: BN;
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
  modules: ModuleMap;
};

export type TKeyArgs = {
  enableLogging?: boolean;
  modules?: ModuleMap;
  serviceProvider?: IServiceProvider;
  storageLayer?: IStorageLayer;
  directParams?: DirectWebSDKArgs;
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
  data: Array<number>;
};

export interface ShareRequestArgs {
  encPubKey: unknown;
  encShareInTransit: EncryptedMessage;
  availableShareIndexes: Array<string>;
  userAgent: string;
}

export interface ISubTkeyModule extends IModule {
  setData(data: unknown): Promise<void>;
  deleteKey(): Promise<void>;
  getData(keys: Array<string>): Promise<TkeyStoreDataArgs>;
}

export interface ITKeyApi {
  storageLayer: IStorageLayer;

  getMetadata(): IMetadata;
  initialize(input?: ShareStore, importKey?: BN): Promise<KeyDetails>;
  catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;
  syncShareMetadata(adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;
  inputShareSafe(shareStore: ShareStore): Promise<void>;
  setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
  addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
  inputShare(shareStore: ShareStore): void;
  addRefreshMiddleware(
    moduleName: string,
    middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown
  ): void;
  generateNewShare(): Promise<GenerateNewShareResult>;
  outputShare(shareIndex: BNString): ShareStore;
  encrypt(data: Buffer): Promise<EncryptedMessage>;
  decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;
  getData(keys: Array<string>): Promise<TkeyStoreDataArgs>;
  deleteKey(): Promise<void>;
  setData(data: unknown): Promise<void>;
}

export interface ITKey extends ITKeyApi, ISerializable {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  refreshMiddleware: RefreshMiddlewareMap;

  initialize(input: ShareStore): Promise<KeyDetails>;

  reconstructKey(): Promise<BN>;

  reconstructLatestPoly(): Polynomial;

  refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;

  initializeNewKey(params: { userInput?: BN; initializeModules?: boolean }): Promise<InitializeNewKeyResult>;

  syncSingleShareMetadata(share: BN, adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;

  setKey(privKey: BN): void;

  getKeyDetails(): KeyDetails;

  encrypt(data: Buffer): Promise<EncryptedMessage>;
  decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;
  getData(keys: Array<string>): Promise<TkeyStoreDataArgs>;
  deleteKey(): Promise<void>;
  setData(data: unknown): Promise<void>;
}

export interface ISeedPhraseStore {
  seedPhraseType: string;
  seedPhrase: string;
}
export type MetamaskSeedPhraseStore = {
  seedPhraseType: string;
  seedPhrase: string;
  numberOfWallets: number;
};

export interface ISeedPhraseFormat {
  seedPhraseType: string;
  validateSeedPhrase(seedPhrase: string): boolean;
  deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Array<BN>;
  createSeedPhraseStore(seedPhrase: string): Promise<ISeedPhraseStore>;
}
