import { IStorageLayer, KeyType } from "@tkey/common-types";
import BN from "bn.js";
import { TSSTorusServiceProvider } from "../src";
export declare function initStorageLayer(): IStorageLayer;
export declare function fetchPostboxKeyAndSigs(opts: {
    serviceProvider: TSSTorusServiceProvider;
    verifierName: string;
    verifierId: string;
}): Promise<{
    signatures: string[];
    postboxkey: BN;
}>;
export declare function assignTssDkgKeys(opts: {
    serviceProvider: TSSTorusServiceProvider;
    verifierName: string;
    verifierId: string;
    maxTSSNonceToSimulate: number;
    tssTag?: string;
}): Promise<{
    serverDKGPrivKeys: BN[];
}>;
export declare function generateKey(keyType: KeyType): {
    raw: Buffer;
    scalar: BN;
};
