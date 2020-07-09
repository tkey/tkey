import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

import Metadata from "../metadata";
import { BNString, IServiceProvider, IStorageLayer, PolynomialID } from "./commonTypes";
import Point from "./Point";
import ShareStore, { ShareStoreMap } from "./ShareStore";

// @flow

export type ModuleMap = {
  [moduleName: string]: IModule;
};

export interface IModule {
  moduleName: string;
  initialize(tbSDK: IThresholdBak);
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
  modules: ModuleMap;
};

export interface IThresholdBak {
  initialize(input: ShareStore): Promise<KeyDetails>;

  catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;

  reconstructKey(): BN;

  generateNewShare(): Promise<GenerateNewShareResult>;

  refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;

  initializeNewKey(userInput?: BN): Promise<InitializeNewKeyResult>;

  inputShare(shareStore: ShareStore): void;

  outputShare(shareIndex: BNString): ShareStore;

  setKey(privKey: BN): void;

  getKeyDetails(): KeyDetails;
}

export type ThresholdBakArgs = {
  enableLogging?: boolean;
  modules?: ModuleMap;
  serviceProvider?: IServiceProvider;
  storageLayer: IStorageLayer;
  directParams?: DirectWebSDKArgs;
};
