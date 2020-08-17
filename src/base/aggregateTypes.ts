import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

import Metadata from "../metadata";
import { BNString, EncryptedMessage, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";
import Point from "./Point";
import { Polynomial } from "./Polynomial";
import PublicShare from "./PublicShare";
import ShareStore, { ScopedStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "./ShareStore";

// @flow

export type ModuleMap = {
  [moduleName: string]: IModule;
};

export interface IModule {
  moduleName: string;
  // called to initialize a module on the main TBSDK.
  // currenty called immedietly after the base metadata has been set on the SDK
  initialize(api: IThresholdBakApi): Promise<void>;
}

export type InitializeNewKeyResult = {
  privKey: BN;
  deviceShare?: ShareStore;
  userShare?: ShareStore;
};

export type CatchupToLatestShareResult = {
  latestShare: ShareStore;
  shareMetadata: Metadata;
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

export interface IThresholdBakApi {
  metadata: Metadata;
  storageLayer: IStorageLayer;

  catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;
  syncShareMetadata(adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;
  inputShareSafe(shareStore: ShareStore): Promise<void>;
  setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
  addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
  inputShare(shareStore: ShareStore): void;
  addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown) => unknown): void;
  generateNewShare(): Promise<GenerateNewShareResult>;
  outputShare(shareIndex: BNString): ShareStore;
}

export interface IThresholdBak extends IThresholdBakApi {
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
}

export type ThresholdBakArgs = {
  enableLogging?: boolean;
  modules?: ModuleMap;
  serviceProvider?: IServiceProvider;
  storageLayer?: IStorageLayer;
  directParams?: DirectWebSDKArgs;
};

export type RefreshMiddlewareMap = {
  [moduleName: string]: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown;
};

export interface SecurityQuestionStoreArgs {
  nonce: BNString;

  shareIndex: BNString;

  sqPublicShare: PublicShare;

  polynomialID: PolynomialID;

  questions: string;
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
}
