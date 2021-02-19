import { IServiceProvider, IStorageLayer, StringifiedType, TorusStorageLayerAPIParams, TorusStorageLayerArgs } from "@tkey/common-types";
import BN from "bn.js";
declare class TorusStorageLayer implements IStorageLayer {
    enableLogging: boolean;
    hostUrl: string;
    serviceProvider: IServiceProvider;
    constructor({ enableLogging, hostUrl, serviceProvider }: TorusStorageLayerArgs);
    /**
     *  Get metadata for a key
     * @param privKey If not provided, it will use service provider's share for decryption
     */
    getMetadata<T>(params: {
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<T>;
    setMetadataBulkStream<T>(params: {
        input: Array<T>;
        serviceProvider?: IServiceProvider;
        privKey?: Array<BN>;
    }): Promise<{
        message: string;
    }[]>;
    /**
     * Set Metadata for a key
     * @param input data to post
     * @param privKey If not provided, it will use service provider's share for encryption
     */
    setMetadata<T>(params: {
        input: T;
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<{
        message: string;
    }>;
    /**
     * Set Metadata for keys
     * @param input data to post
     * @param privKey If not provided, it will use service provider's share for encryption
     */
    setMetadataBulk<T>(params: {
        input: Array<T>;
        serviceProvider?: IServiceProvider;
        privKey?: Array<BN>;
    }): Promise<{
        message: string;
    }[]>;
    generateMetadataParams(message: unknown, serviceProvider?: IServiceProvider, privKey?: BN): TorusStorageLayerAPIParams;
    acquireWriteLock(params: {
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<{
        status: number;
        id?: string;
    }>;
    releaseWriteLock(params: {
        id: string;
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<{
        status: number;
    }>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TorusStorageLayer;
}
export default TorusStorageLayer;
