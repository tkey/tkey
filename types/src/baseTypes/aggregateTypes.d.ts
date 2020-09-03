import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { Point, Polynomial, PublicPolynomial, PublicPolynomialMap, PublicShare, PublicSharePolyIDShareIndexMap, ScopedStore, Share, ShareMap, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "../base";
import { BNString, EncryptedMessage, ISerializable, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";
export interface IModule {
    moduleName: string;
    initialize(api: ITKeyApi): Promise<void>;
}
export declare type ModuleMap = {
    [moduleName: string]: IModule;
};
export declare type RefreshMiddlewareMap = {
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
    addShareDescription(shareIndex: string, description: string): void;
    deleteShareDescription(shareIndex: string, description: string): void;
    clone(): IMetadata;
}
export declare type InitializeNewKeyResult = {
    privKey: BN;
    deviceShare?: ShareStore;
    userShare?: ShareStore;
};
export declare type CatchupToLatestShareResult = {
    latestShare: ShareStore;
    shareMetadata: IMetadata;
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
export interface ITKeyApi {
    metadata: IMetadata;
    storageLayer: IStorageLayer;
    catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;
    syncShareMetadata(adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;
    inputShareSafe(shareStore: ShareStore): Promise<void>;
    setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
    addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    inputShare(shareStore: ShareStore): void;
    addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown): void;
    generateNewShare(): Promise<GenerateNewShareResult>;
    outputShare(shareIndex: BNString): ShareStore;
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
    initializeNewKey(params: {
        userInput?: BN;
        initializeModules?: boolean;
    }): Promise<InitializeNewKeyResult>;
    syncSingleShareMetadata(share: BN, adjustScopedStore?: (ss: ScopedStore) => ScopedStore): Promise<void>;
    setKey(privKey: BN): void;
    getKeyDetails(): KeyDetails;
}
export declare type TKeyArgs = {
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
