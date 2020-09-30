/// <reference types="node" />
import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";
export declare type PubKeyType = "ecc";
export declare type PolynomialID = string;
export declare type BNString = string | BN;
export interface EncryptedMessage {
    ciphertext: string;
    ephemPublicKey: string;
    iv: string;
    mac: string;
}
export interface ServiceProviderArgs {
    enableLogging?: boolean;
    postboxKey?: string;
}
export interface TorusServiceProviderArgs extends ServiceProviderArgs {
    directParams: DirectWebSDKArgs;
}
export declare type StringifiedType = Record<string, any>;
export interface ISerializable {
    toJSON(): StringifiedType;
}
export interface IPoint extends ISerializable {
    x: BN;
    y: BN;
    encode(enc: string, params?: unknown): Buffer;
}
export interface IServiceProvider extends ISerializable {
    ec: EC;
    enableLogging: boolean;
    postboxKey: BN;
    encrypt(msg: Buffer): Promise<EncryptedMessage>;
    decrypt(msg: EncryptedMessage): Promise<Buffer>;
    retrievePubKey(type: PubKeyType): Buffer;
    retrievePubKeyPoint(): curve.base.BasePoint;
    sign(msg: BNString): string;
}
export declare type TorusStorageLayerAPIParams = {
    pub_key_X: string;
    pub_key_Y: string;
    set_data: unknown;
    signature: string;
    namespace: string;
};
export interface IStorageLayer extends ISerializable {
    enableLogging: boolean;
    hostUrl: string;
    serviceProvider: IServiceProvider;
    getMetadata<T>(privKey?: BN): Promise<T>;
    setMetadata<T>(input: T, privKey?: BN): Promise<{
        message: string;
    }>;
    setMetadataBulk<T>(input: T[], privKey?: BN[]): Promise<{
        message: string;
    }[]>;
    generateMetadataParams(message: unknown, privKey: BN): TorusStorageLayerAPIParams;
}
export declare type TorusStorageLayerArgs = {
    enableLogging?: boolean;
    hostUrl?: string;
    serviceProvider: IServiceProvider;
};
export declare type ShareDescriptionMap = {
    [shareIndexStr: string]: string[];
};
