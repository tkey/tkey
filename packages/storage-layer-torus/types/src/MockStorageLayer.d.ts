import { IServiceProvider, IStorageLayer, MockStorageLayerArgs, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";
declare class MockStorageLayer implements IStorageLayer {
    dataMap: {
        [key: string]: unknown;
    };
    serviceProvider: IServiceProvider;
    constructor({ dataMap, serviceProvider }: MockStorageLayerArgs);
    /**
     *  Get metadata for a key
     * @param privKey If not provided, it will use service provider's share for decryption
     */
    getMetadata<T>(serviceProvider?: IServiceProvider, privKey?: BN): Promise<T>;
    /**
     * Set Metadata for a key
     * @param input data to post
     * @param privKey If not provided, it will use service provider's share for encryption
     */
    setMetadata<T>(input: T, serviceProvider?: IServiceProvider, privKey?: BN): Promise<{
        message: string;
    }>;
    /**
     * Set Metadata for keys
     * @param input data to post
     * @param privKey If not provided, it will use service provider's share for encryption
     */
    setMetadataBulk<T>(input: Array<T>, serviceProvider?: IServiceProvider, privKey?: Array<BN>): Promise<{
        message: string;
    }[]>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): MockStorageLayer;
}
export default MockStorageLayer;
