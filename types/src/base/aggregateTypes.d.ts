import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import Metadata from "../metadata";
import { BNString, EncryptedMessage, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";
import Point from "./Point";
import PublicShare from "./PublicShare";
import ShareStore, { ScopedStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "./ShareStore";
export declare type ModuleMap = {
    [moduleName: string]: IModule;
};
export interface IModule {
    moduleName: string;
    initialize(tbSDK: IThresholdBak): Promise<void>;
}
export declare type InitializeNewKeyResult = {
    privKey: BN;
    deviceShare?: ShareStore;
    userShare?: ShareStore;
};
export declare type CatchupToLatestShareResult = {
    latestShare: ShareStore;
    shareMetadata: Metadata;
};
export declare type GenerateNewShareResult = {
    newShareStores: ShareStoreMap;
    newShareIndex: BN;
};
export declare type RefreshSharesResult = {
    shareStores: ShareStoreMap;
};
export declare type KeyDetails = {
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
    reconstructKey(): Promise<BN>;
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
export declare type ThresholdBakArgs = {
    enableLogging?: boolean;
    modules?: ModuleMap;
    serviceProvider?: IServiceProvider;
    storageLayer: IStorageLayer;
    directParams?: DirectWebSDKArgs;
};
export declare type RefreshMiddlewareMap = {
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
export declare type BufferObj = {
    type: string;
    data: Array<number>;
};
export interface ShareRequestArgs {
    encPubKey: unknown;
    encShareInTransit: EncryptedMessage;
}
