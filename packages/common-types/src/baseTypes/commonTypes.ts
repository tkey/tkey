import type { CustomAuthArgs } from "@toruslabs/customauth";
import BN from "bn.js";
import type { curve } from "elliptic";

import ShareStore from "../base/ShareStore";

export type PubKeyType = "ecc";

// @flow
export type PolynomialID = string;

export type PolyIDAndShares = [PolynomialID, string[]];

export type BNString = string | BN;

export interface EncryptedMessage {
  ciphertext: string;
  ephemPublicKey: string;
  iv: string;
  mac: string;
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

export type GetTSSPubKeyFunc = () => IPoint;
export type GetTSSSignFunc = (msg: BNString, otherShares: ShareStore[]) => Buffer;

export interface ServiceProviderArgs {
  enableLogging?: boolean;
  postboxKey?: string;
  getTSSPubKey?: GetTSSPubKeyFunc; // for now is just sum of key
  getTSSSign?: GetTSSSignFunc;
}

export interface TorusServiceProviderArgs extends ServiceProviderArgs {
  customAuthArgs: CustomAuthArgs;
}
export interface IServiceProvider extends ISerializable {
  enableLogging: boolean;

  postboxKey: BN;

  serviceProviderName: string;

  // Added items for TSSKey
  getTSSPubKey?: GetTSSPubKeyFunc; // for now is just sum of key
  getTSSSign?: GetTSSSignFunc;

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
  storageLayerName: string;

  getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<T>;

  setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ message: string }>;

  setMetadataStream<T>(params: { input: T[]; serviceProvider?: IServiceProvider; privKey?: BN[] }): Promise<{ message: string }>;

  acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number; id?: string }>;

  releaseWriteLock(params: { id: string; serviceProvider?: IServiceProvider; privKey?: BN }): Promise<{ status: number }>;
}

export type TorusStorageLayerArgs = {
  enableLogging?: boolean;
  hostUrl?: string;
  serverTimeOffset?: number;
};

export type MockStorageLayerArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataMap: any;
  lockMap: any;
};

export type ShareDescriptionMap = {
  [shareIndexStr: string]: string[];
};

export type FromJSONConstructor = {
  fromJSON(value: StringifiedType): any;
};

export type DeviceShareDescription = { module: string; userAgent: string; dateAdded: number; customDeviceInfo?: string };
