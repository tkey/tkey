import { IServiceProvider, IStorageLayer, MockStorageLayerArgs, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";
declare class MockStorageLayer implements IStorageLayer {
    dataMap: {
        [key: string]: unknown;
    };
    lockMap: {
        [key: string]: string;
    };
    serviceProvider: IServiceProvider;
    constructor({ dataMap, serviceProvider, lockMap }: MockStorageLayerArgs);
    /**
     *  Get metadata for a key
     * @param privKey If not provided, it will use service provider's share for decryption
     */
    getMetadata<T>(params: {
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<T>;
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
    static fromJSON(value: StringifiedType): MockStorageLayer;
}
export default MockStorageLayer;
