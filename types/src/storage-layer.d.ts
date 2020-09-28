import BN from "bn.js";
import { IServiceProvider, IStorageLayer, StringifiedType, TorusStorageLayerAPIParams, TorusStorageLayerArgs } from "./baseTypes/commonTypes";
declare class TorusStorageLayer implements IStorageLayer {
    enableLogging: boolean;
    hostUrl: string;
    serviceProvider: IServiceProvider;
    constructor({ enableLogging, hostUrl, serviceProvider }: TorusStorageLayerArgs);
    getMetadata<T>(privKey: BN): Promise<T>;
    setMetadata<T>(input: T, privKey: BN): Promise<{
        message: string;
    }>;
    setMetadataBulk<T>(input: Array<T>, privKey: Array<BN>): Promise<{
        message: string;
    }>;
    generateMetadataParams(message: unknown, privKey?: BN): TorusStorageLayerAPIParams;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TorusStorageLayer;
}
export default TorusStorageLayer;
