import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";

export type PubKeyType = "ecc";

// @flow
export type PolynomialID = string;

export type BNString = string | BN;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StringifiedType = Record<string, any>;

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
export type TorusStorageLayerAPIParams = {
  pub_key_X: string;
  pub_key_Y: string;
  set_data: unknown;
  signature: string;
  namespace: string;
};

export interface IStorageLayer extends ISerializable {
  getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<T>;

  setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ message: string }>;

  setMetadataBulk<T>(params: { input: T[]; serviceProvider?: IServiceProvider; privKey?: BN[] }): Promise<{ message: string }[]>;

  acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number; id?: string }>;

  releaseWriteLock(params: { id: string; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number }>;
}

export type TorusStorageLayerArgs = {
  enableLogging?: boolean;
  hostUrl?: string;
  serviceProvider: IServiceProvider;
};

export type MockStorageLayerArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataMap: any;
  serviceProvider: IServiceProvider;
};

export type ShareDescriptionMap = {
  [shareIndexStr: string]: string[];
};
