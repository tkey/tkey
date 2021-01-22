/// <reference types="node" />
import { BNString, CatchupToLatestShareResult, DeleteShareResult, EncryptedMessage, GenerateNewShareResult, IMetadata, InitializeNewKeyResult, IServiceProvider, IStorageLayer, ITKey, ITKeyApi, KeyDetails, ModuleMap, Polynomial, PolynomialID, ReconstructedKeyResult, ReconstructKeyMiddlewareMap, RefreshMiddlewareMap, RefreshSharesResult, ShareSerializationMiddleware, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap, StringifiedType, TKeyArgs, TkeyStoreItemType } from "@tkey/common-types";
import BN from "bn.js";
import Metadata from "./metadata";
declare class ThresholdKey implements ITKey {
    modules: ModuleMap;
    enableLogging: boolean;
    serviceProvider: IServiceProvider;
    storageLayer: IStorageLayer;
    shares: ShareStorePolyIDShareIndexMap;
    privKey: BN;
    metadata: Metadata;
    refreshMiddleware: RefreshMiddlewareMap;
    reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;
    shareSerializationMiddleware: ShareSerializationMiddleware;
    storeDeviceShare: (deviceShareStore: ShareStore) => Promise<void>;
    haveWriteMetadataLock: string;
    constructor(args?: TKeyArgs);
    getApi(): ITKeyApi;
    getMetadata(): IMetadata;
    initialize(params?: {
        input?: ShareStore;
        importKey?: BN;
        neverInitializeNewKey?: boolean;
    }): Promise<KeyDetails>;
    private setModuleReferences;
    private initializeModules;
    /**
     * catchupToLatestShare recursively loops fetches metadata of the provided share and checks if there is an encrypted share for it.
     * @param shareStore share to start of with
     * @param polyID if specified, polyID to refresh to if it exists
     */
    catchupToLatestShare(shareStore: ShareStore, polyID?: PolynomialID): Promise<CatchupToLatestShareResult>;
    reconstructKey(reconstructKeyMiddleware?: boolean): Promise<ReconstructedKeyResult>;
    reconstructLatestPoly(): Polynomial;
    deleteShare(shareIndex: BNString): Promise<DeleteShareResult>;
    generateNewShare(): Promise<GenerateNewShareResult>;
    refreshShares(threshold: number, newShareIndexes: Array<string>, previousPolyID: PolynomialID): Promise<RefreshSharesResult>;
    initializeNewKey({ determinedShare, initializeModules, importedKey, }?: {
        determinedShare?: BN;
        initializeModules?: boolean;
        importedKey?: BN;
    }): Promise<InitializeNewKeyResult>;
    inputShareStore(shareStore: ShareStore): void;
    inputShareStoreSafe(shareStore: ShareStore): Promise<void>;
    outputShareStore(shareIndex: BNString): ShareStore;
    setKey(privKey: BN): void;
    getKey(): BN[];
    getCurrentShareIndexes(): string[];
    getKeyDetails(): KeyDetails;
    setAuthMetadata(params: {
        input: Metadata;
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<void>;
    setAuthMetadataBulk(params: {
        input: Metadata[];
        serviceProvider?: IServiceProvider;
        privKey?: BN[];
    }): Promise<void>;
    getAuthMetadata(params: {
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<Metadata>;
    acquireWriteMetadataLock(): Promise<number>;
    releaseWriteMetadataLock(): Promise<void>;
    syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    syncMultipleShareMetadata(shares: Array<BN>, adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown): void;
    addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
    addShareSerializationMiddleware(serialize: (share: BN, type: string) => Promise<unknown>, deserialize: (serializedShare: unknown, type: string) => Promise<BN>): void;
    setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
    addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    deleteShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    encrypt(data: Buffer): Promise<EncryptedMessage>;
    decrypt(encryptedMessage: EncryptedMessage): Promise<Buffer>;
    setTKeyStoreItem(moduleName: string, data: TkeyStoreItemType, updateMetadata?: boolean): Promise<void>;
    deleteTKeyStoreItem(moduleName: string, id: string): Promise<void>;
    getTKeyStore(moduleName: string): Promise<TkeyStoreItemType[]>;
    getTKeyStoreItem(moduleName: string, id: string): Promise<TkeyStoreItemType>;
    outputShare(shareIndex: BNString, type?: string): Promise<unknown>;
    inputShare(share: unknown, type?: string): Promise<void>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType, args: TKeyArgs): Promise<ThresholdKey>;
}
export default ThresholdKey;
