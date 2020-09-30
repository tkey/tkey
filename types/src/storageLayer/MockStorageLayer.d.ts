import BN from "bn.js";
import { IServiceProvider, IStorageLayer, MockStorageLayerArgs, StringifiedType } from "../baseTypes/commonTypes";
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
    getMetadata<T>(privKey?: BN): Promise<T>;
    /**
     * Set Metadata for a key
     * @param input data to post
     * @param privKey If not provided, it will use service provider's share for encryption
     */
    setMetadata<T>(input: T, privKey?: BN): Promise<{
        message: string;
    }>;
    /**
     * Set Metadata for keys
     * @param input data to post
     * @param privKey If not provided, it will use service provider's share for encryption
     */
    setMetadataBulk<T>(input: Array<T>, privKey?: Array<BN>): Promise<{
        message: string;
    }[]>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): MockStorageLayer;
}
export default MockStorageLayer;
