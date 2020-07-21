import BN from "bn.js";
import { IServiceProvider, IStorageLayer, TorusStorageLayerAPIParams, TorusStorageLayerArgs } from "./base/commonTypes";
declare class TorusStorageLayer implements IStorageLayer {
    enableLogging: boolean;
    hostUrl: string;
    serviceProvider: IServiceProvider;
    constructor({ enableLogging, hostUrl, serviceProvider }: TorusStorageLayerArgs);
    getMetadata<T>(privKey?: BN): Promise<T>;
    setMetadata<T>(input: T, privKey?: BN): Promise<{
        message: string;
    }>;
    generateMetadataParams(message: unknown, privKey: BN): TorusStorageLayerAPIParams;
}
export default TorusStorageLayer;
