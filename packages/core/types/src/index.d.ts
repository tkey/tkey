/// <reference types="node" />
import { BNString, CatchupToLatestShareResult, EncryptedMessage, GenerateNewShareResult, IMetadata, InitializeNewKeyResult, IServiceProvider, IStorageLayer, ITKey, ITKeyApi, KeyDetails, ModuleMap, Polynomial, PolynomialID, ReconstructedKeyResult, ReconstructKeyMiddlewareMap, RefreshMiddlewareMap, RefreshSharesResult, ShareStore, ShareStoreMap, ShareStorePolyIDShareIndexMap, StringifiedType, TKeyArgs } from "@tkey/common-types";
import BN from "bn.js";
import Metadata from "./metadata";
declare class ThresholdKey implements ITKey {
    modules: ModuleMap;
    enableLogging: boolean;
    serviceProvider: IServiceProvider;
    storageLayer: IStorageLayer;
    shares: ShareStorePolyIDShareIndexMap;
    privKey: BN;
    tkeyStoreModuleName: string;
    metadata: Metadata;
    refreshMiddleware: RefreshMiddlewareMap;
    reconstructKeyMiddleware: ReconstructKeyMiddlewareMap;
    storeDeviceShare: (deviceShareStore: ShareStore) => Promise<void>;
    constructor(args?: TKeyArgs);
    getApi(): ITKeyApi;
    getMetadata(): IMetadata;
    initialize(input?: ShareStore, importKey?: BN): Promise<KeyDetails>;
    private setModuleReferences;
    private initializeModules;
    /**
     * catchupToLatestShare recursively loops fetches metadata of the provided share and checks if there is an encrypted share for it.
     * @param shareStore share to start of with
     * @param polyID if specified, polyID to refresh to if it exists
     */
    catchupToLatestShare(shareStore: ShareStore, polyID?: PolynomialID): Promise<CatchupToLatestShareResult>;
    reconstructKey(): Promise<ReconstructedKeyResult>;
    reconstructLatestPoly(): Polynomial;
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
    syncShareMetadata(adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    syncMultipleShareMetadata(shares: Array<BN>, adjustScopedStore?: (ss: unknown) => unknown): Promise<void>;
    addRefreshMiddleware(moduleName: string, middleware: (generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap) => unknown): void;
    addReconstructKeyMiddleware(moduleName: string, middleware: () => Promise<Array<BN>>): void;
    setDeviceStorage(storeDeviceStorage: (deviceShareStore: ShareStore) => Promise<void>): void;
    addShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    deleteShareDescription(shareIndex: string, description: string, updateMetadata?: boolean): Promise<void>;
    encrypt(data: Buffer): Promise<EncryptedMessage>;
    decrypt(encryptedMessage: EncryptedMessage): Promise<Buffer>;
    setTKeyStore(moduleName: string, data: unknown): Promise<void>;
    deleteKey(moduleName: string, key: string): Promise<void>;
    getTKeyStore(moduleName: string, key: string): Promise<unknown>;
    outputShare(shareIndex: BNString, type?: string): unknown;
    inputShare(share: unknown, type?: string): Promise<void>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType, args: TKeyArgs): Promise<ThresholdKey>;
}
export default ThresholdKey;
