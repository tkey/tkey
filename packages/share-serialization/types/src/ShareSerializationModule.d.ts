import { IModule, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";
export declare const SHARE_SERIALIZATION_MODULE_NAME = "shareSerialization";
declare class ShareSerializationModule implements IModule {
    moduleName: string;
    tbSDK: ITKeyApi;
    constructor();
    setModuleReferences(tbSDK: ITKeyApi): void;
    initialize(): Promise<void>;
    serialize(share: BN, type: string): Promise<unknown>;
    deserialize(serializedShare: unknown, type: string): Promise<BN>;
    static serializeMnemonic(share: BN): string;
    static deserializeMnemonic(share: string): BN;
}
export default ShareSerializationModule;
