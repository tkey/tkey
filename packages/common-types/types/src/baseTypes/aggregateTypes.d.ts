/// <reference types="node" />
import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { Point, Polynomial, PublicPolynomial, PublicPolynomialMap, PublicShare, PublicSharePolyIDShareIndexMap, Share, ShareMap, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap } from "../base";
import { BNString, EncryptedMessage, ISerializable, IServiceProvider, IStorageLayer, PolynomialID, ShareDescriptionMap } from "./commonTypes";
export interface IModule {
    moduleName: string;
    setModuleReferences(api: ITKeyApi): void;
    initialize(): Promise<void>;
}
export declare type ModuleMap = {
    [moduleName: string]: IModule;
};
export declare type RefreshMiddlewareMap = {
    [moduleName: string]: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown;
};
export declare type ReconstructKeyMiddlewareMap = {
    [moduleName: string]: () => Promise<BN[]>;
};
export declare type ShareSerializationMiddleware = {
    serialize: (share: BN, type: string) => Promise<unknown>;
    deserialize: (serializedShare: unknown, type: string) => Promise<BN>;
};
export interface IMetadata extends ISerializable {
    pubKey: Point;
    publicPolynomials: PublicPolynomialMap;
    publicShares: PublicSharePolyIDShareIndexMap;
    polyIDList: PolynomialID[];
    generalStore: {
        [moduleName: string]: unknown;
    };
    tkeyStore: {
        [moduleName: string]: unknown;
    };
    scopedStore: {
        [moduleName: string]: unknown;
    };
    getShareIndexesForPolynomial(polyID: PolynomialID): string[];
    getLatestPublicPolynomial(): PublicPolynomial;
    addPublicPolynomial(publicPolynomial: PublicPolynomial): void;
    addPublicShare(polynomialID: PolynomialID, publicShare: PublicShare): void;
    setGeneralStoreDomain(key: string, obj: unknown): void;
    getGeneralStoreDomain(key: string): unknown;
    setTkeyStoreDomain(key: string, obj: unknown): void;
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
export declare type InitializeNewKeyResult = {
    privKey: BN;
    deviceShare?: ShareStore;
    userShare?: ShareStore;
};
export declare type ReconstructedKeyResult = {
    privKey: BN;
    seedPhrase?: BN[];
    allKeys?: BN[];
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
export interface TkeyStoreDataArgs {
    [key: string]: unknown;
}
export interface TkeyStoreArgs {
    data: TkeyStoreDataArgs;
}
export interface ShareTransferStorePointerArgs {
    pointer: BNString;
}
export declare type BufferObj = {
    type: string;
    data: number[];
};
export interface ShareRequestArgs {
    encPubKey: unknown;
    encShareInTransit: EncryptedMessage;
    availableShareIndexes: string[];
    userAgent: string;
    timestamp: number;
}
export interface ISeedPhraseStore {
    seedPhraseType: string;
    seedPhrase: string;
}
export declare type MetamaskSeedPhraseStore = {
    seedPhraseType: string;
    seedPhrase: string;
    numberOfWallets: number;
};
export interface ISECP256k1NStore {
    privateKeys: BN[];
    privateKeyType: string;
}
export declare type SECP256k1NStore = {
    privateKeys: BN[];
    privateKeyType: string;
};
export interface ISeedPhraseFormat {
    seedPhraseType: string;
    validateSeedPhrase(seedPhrase: string): boolean;
    deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Array<BN>;
    createSeedPhraseStore(seedPhrase: string): Promise<ISeedPhraseStore>;
}
export interface IPrivateKeyFormat {
    privateKeys: BN[];
    privateKeyType: string;
    validatePrivateKeys(privateKey: BN): boolean;
    createPrivateKeyStore(privateKey: BN[]): SECP256k1NStore;
}
export interface ISubTkeyModule extends IModule {
    setTKeyStore(moduleName: string, data: unknown): Promise<void>;
    deleteKey(moduleName: string, key: string): any;
    getTKeyStore(moduleName: string, key: string): Promise<unknown>;
}
export interface ITKeyApi {
    storageLayer: IStorageLayer;
    getMetadata(): IMetadata;
    initialize(input?: ShareStore, importKey?: BN): Promise<KeyDetails>;
    catchupToLatestShare(shareStore: ShareStore): Promise<CatchupToLatestShareResult>;
    syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    inputShareStoreSafe(shareStore: ShareStore): Promise<void>;
    setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
    addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    inputShareStore(shareStore: ShareStore): void;
    addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown): void;
    addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
    addShareSerializationMiddleware(serialize: (share: BN, type: string) => Promise<unknown>, deserialize: (serializedShare: unknown, type: string) => Promise<BN>): void;
    generateNewShare(): Promise<GenerateNewShareResult>;
    outputShareStore(shareIndex: BNString): ShareStore;
    inputShare(share: unknown, type: string): Promise<void>;
    outputShare(shareIndex: BNString, type: string): Promise<unknown>;
    encrypt(data: Buffer): Promise<EncryptedMessage>;
    decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;
    getTKeyStore(moduleName: string, key: string): Promise<unknown>;
    deleteKey(moduleName: string, key: string): any;
    setTKeyStore(moduleName: string, data: unknown): Promise<void>;
}
export interface ITKey extends ITKeyApi, ISerializable {
    modules: ModuleMap;
    enableLogging: boolean;
    serviceProvider: IServiceProvider;
    shares: ShareStorePolyIDShareIndexMap;
    privKey: BN;
    refreshMiddleware: RefreshMiddlewareMap;
    reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;
    shareSerializationMiddleware: ShareSerializationMiddleware;
    initialize(input: ShareStore): Promise<KeyDetails>;
    reconstructKey(): Promise<ReconstructedKeyResult>;
    reconstructLatestPoly(): Polynomial;
    refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;
    initializeNewKey(params: {
        userInput?: BN;
        initializeModules?: boolean;
    }): Promise<InitializeNewKeyResult>;
    setKey(privKey: BN): void;
    getKeyDetails(): KeyDetails;
    encrypt(data: Buffer): Promise<EncryptedMessage>;
    decrypt(encryptedMesage: EncryptedMessage): Promise<Buffer>;
    getTKeyStore(moduleName: string, key: string): Promise<unknown>;
    deleteKey(moduleName: string, key: string): any;
    setTKeyStore(moduleName: string, data: unknown): Promise<void>;
}
