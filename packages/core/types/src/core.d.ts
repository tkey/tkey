/// <reference types="node" />
import { BNString, CatchupToLatestShareResult, DeleteShareResult, EncryptedMessage, FromJSONConstructor, GenerateNewShareResult, IMetadata, InitializeNewKeyResult, IServiceProvider, IStorageLayer, ITKey, ITKeyApi, KeyDetails, LocalMetadataTransitions, LocalTransitionData, ModuleMap, Polynomial, PolynomialID, ReconstructedKeyResult, ReconstructKeyMiddlewareMap, RefreshMiddlewareMap, RefreshSharesResult, ShareSerializationMiddleware, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap, StringifiedType, TKeyArgs, TkeyStoreItemType } from "@tkey/common-types";
import BN from "bn.js";
import AuthMetadata from "./authMetadata";
import Metadata from "./metadata";
declare class ThresholdKey implements ITKey {
    modules: ModuleMap;
    enableLogging: boolean;
    serviceProvider: IServiceProvider;
    storageLayer: IStorageLayer;
    shares: ShareStorePolyIDShareIndexMap;
    privKey: BN;
    lastFetchedCloudMetadata: Metadata;
    metadata: Metadata;
    manualSync: boolean;
    _localMetadataTransitions: LocalMetadataTransitions;
    _refreshMiddleware: RefreshMiddlewareMap;
    _reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;
    _shareSerializationMiddleware: ShareSerializationMiddleware;
    storeDeviceShare: (deviceShareStore: ShareStore, customDeviceInfo?: StringifiedType) => Promise<void>;
    haveWriteMetadataLock: string;
    args: TKeyArgs;
    constructor(args?: TKeyArgs);
    getStorageLayer(): IStorageLayer;
    getMetadata(): IMetadata;
    initialize(params?: {
        withShare?: ShareStore;
        importKey?: BN;
        neverInitializeNewKey?: boolean;
        transitionMetadata?: Metadata;
        previouslyFetchedCloudMetadata?: Metadata;
        previousLocalMetadataTransitions?: LocalMetadataTransitions;
        customDeviceInfo?: StringifiedType;
    }): Promise<KeyDetails>;
    private setModuleReferences;
    private initializeModules;
    /**
     * catchupToLatestShare recursively loops fetches metadata of the provided share and checks if there is an encrypted share for it.
     * @param shareStore share to start of with
     * @param polyID if specified, polyID to refresh to if it exists
     */
    catchupToLatestShare(params: {
        shareStore: ShareStore;
        polyID?: PolynomialID;
        includeLocalMetadataTransitions?: boolean;
    }): Promise<CatchupToLatestShareResult>;
    reconstructKey(_reconstructKeyMiddleware?: boolean): Promise<ReconstructedKeyResult>;
    reconstructLatestPoly(): Polynomial;
    deleteShare(shareIndex: BNString): Promise<DeleteShareResult>;
    generateNewShare(): Promise<GenerateNewShareResult>;
    _refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;
    _initializeNewKey({ determinedShare, initializeModules, importedKey, customDeviceInfo, }?: {
        determinedShare?: BN;
        initializeModules?: boolean;
        importedKey?: BN;
        customDeviceInfo?: StringifiedType;
    }): Promise<InitializeNewKeyResult>;
    addLocalMetadataTransitions(params: {
        input: LocalTransitionData;
        serviceProvider?: IServiceProvider;
        privKey?: Array<BN>;
        acquireLock?: boolean;
    }): Promise<void>;
    syncLocalMetadataTransitions(): Promise<void>;
    updateMetadata(params?: {
        withShare?: ShareStore;
    }): Promise<ThresholdKey>;
    inputShareStore(shareStore: ShareStore): void;
    inputShareStoreSafe(shareStore: ShareStore): Promise<void>;
    outputShareStore(shareIndex: BNString, polyID?: string): ShareStore;
    _setKey(privKey: BN): void;
    getCurrentShareIndexes(): string[];
    getKeyDetails(): KeyDetails;
    generateAuthMetadata(params: {
        input: Metadata[];
    }): AuthMetadata[];
    setAuthMetadata(params: {
        input: Metadata;
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<{
        message: string;
    }>;
    setAuthMetadataBulk(params: {
        input: Metadata[];
        serviceProvider?: IServiceProvider;
        privKey?: BN[];
    }): Promise<void>;
    getAuthMetadata(params: {
        serviceProvider?: IServiceProvider;
        privKey?: BN;
        includeLocalMetadataTransitions?: boolean;
    }): Promise<Metadata>;
    getGenericMetadataWithTransitionStates(params: {
        fromJSONConstructor: FromJSONConstructor;
        serviceProvider?: IServiceProvider;
        privKey?: BN;
        includeLocalMetadataTransitions?: boolean;
        _localMetadataTransitions?: LocalMetadataTransitions;
    }): Promise<unknown>;
    acquireWriteMetadataLock(): Promise<number>;
    releaseWriteMetadataLock(): Promise<void>;
    _syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    syncMultipleShareMetadata(shares: Array<BN>, adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    _addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown): void;
    _addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
    _addShareSerializationMiddleware(serialize: (share: BN, type: string) => Promise<unknown>, deserialize: (serializedShare: unknown, type: string) => Promise<BN>): void;
    _setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
    addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    deleteShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    encrypt(data: Buffer): Promise<EncryptedMessage>;
    decrypt(encryptedMessage: EncryptedMessage): Promise<Buffer>;
    _setTKeyStoreItem(moduleName: string, data: TkeyStoreItemType): Promise<void>;
    _deleteTKeyStoreItem(moduleName: string, id: string): Promise<void>;
    getTKeyStore(moduleName: string): Promise<TkeyStoreItemType[]>;
    getTKeyStoreItem(moduleName: string, id: string): Promise<TkeyStoreItemType>;
    outputShare(shareIndex: BNString, type?: string): Promise<unknown>;
    inputShare(share: unknown, type?: string): Promise<void>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType, args: TKeyArgs): Promise<ThresholdKey>;
    getApi(): ITKeyApi;
}
export default ThresholdKey;
