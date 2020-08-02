import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

import Metadata from "../metadata";
import { BNString, EncryptedMessage, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";
import Point from "./Point";
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
  initialize(tbSDK: IThresholdBak): Promise<void>;
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

export interface IThresholdBak {
  modules: ModuleMap;

  enableLogging: boolean;

  serviceProvider: IServiceProvider;

  storageLayer: IStorageLayer;

  shares: ShareStorePolyIDShareIndexMap;

  privKey: BN;

  metadata: Metadata;

  refreshMiddleware: RefreshMiddlewareMap;

  initialize(input: ShareStore): Promise<KeyDetails>;

  catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;

  reconstructKey(): BN;

  generateNewShare(): Promise<GenerateNewShareResult>;

  refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;

  initializeNewKey(userInput?: BN, initializeModules?: boolean): Promise<InitializeNewKeyResult>;

  syncShareMetadata(adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;

  syncSingleShareMetadata(share: BN, adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;

  inputShare(shareStore: ShareStore): void;

  inputShareSafe(shareStore: ShareStore): Promise<void>;

  outputShare(shareIndex: BNString): ShareStore;

  setKey(privKey: BN): void;

  getKeyDetails(): KeyDetails;

  addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown) => unknown): void;

  setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;

  addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
}

export type ThresholdBakArgs = {
  enableLogging?: boolean;
  modules?: ModuleMap;
  serviceProvider?: IServiceProvider;
  storageLayer: IStorageLayer;
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