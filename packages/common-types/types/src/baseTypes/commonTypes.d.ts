/// <reference types="node" />
import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { curve } from "elliptic";
export declare type PubKeyType = "ecc";
export declare type PolynomialID = string;
export declare type PolyIDAndShares = [PolynomialID, string[]];
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
    enableLogging: boolean;
    postboxKey: BN;
    serviceProviderName: string;
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
    storageLayerName: string;
    getMetadata<T>(params: {
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<T>;
    setMetadata<T>(params: {
        input: T;
        serviceProvider?: IServiceProvider;
        privKey?: BN;
    }): Promise<{
        message: string;
    }>;
    setMetadataStream<T>(params: {
        input: T[];
        serviceProvider?: IServiceProvider;
        privKey?: BN[];
    }): Promise<{
        message: string;
    }>;
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
}
export declare type TorusStorageLayerArgs = {
    enableLogging?: boolean;
    hostUrl?: string;
    serviceProvider?: IServiceProvider;
    serverTimeOffset?: number;
};
export declare type MockStorageLayerArgs = {
    dataMap: any;
    serviceProvider: IServiceProvider;
    lockMap: any;
};
export declare type ShareDescriptionMap = {
    [shareIndexStr: string]: string[];
};
export declare type FromJSONConstructor = {
    fromJSON(value: StringifiedType): any;
};
