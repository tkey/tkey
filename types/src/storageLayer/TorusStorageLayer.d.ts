import BN from "bn.js";
import { IServiceProvider, IStorageLayer, StringifiedType, TorusStorageLayerAPIParams, TorusStorageLayerArgs } from "../baseTypes/commonTypes";
declare class TorusStorageLayer implements IStorageLayer {
    enableLogging: boolean;
    hostUrl: string;
    serviceProvider: IServiceProvider;
    constructor({ enableLogging, hostUrl, serviceProvider }: TorusStorageLayerArgs);
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
    generateMetadataParams(message: unknown, privKey?: BN): TorusStorageLayerAPIParams;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TorusStorageLayer;
}
export default TorusStorageLayer;
