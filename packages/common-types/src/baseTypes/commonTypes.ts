import type { CustomAuthArgs } from "@toruslabs/customauth";
import { PointHex } from "@toruslabs/rss-client";
import BN from "bn.js";
import type { curve } from "elliptic";

import Point from "../base/Point";
export { ecPoint, hexPoint, PointHex, randomSelection, RSSClient } from "@toruslabs/rss-client";

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

// if "direct", no serverEncs (empty array), and the tssShare is just the decryption of userEnc
// if "hierarchical", there are serverEncs, and the tssShare is hierarchically stored
// and requires userEnc and threshold number of serverEncs to recover the tssShare
export type FactorEncType = "direct" | "hierarchical";

export type FactorEnc = {
  tssIndex: number;
  type: FactorEncType;
  userEnc: EncryptedMessage;
  serverEncs: EncryptedMessage[];
};
export interface ServiceProviderArgs {
  enableLogging?: boolean;
  postboxKey?: string;
  useTSS?: boolean;
}

export interface TorusServiceProviderArgs extends ServiceProviderArgs {
  customAuthArgs: CustomAuthArgs;
  nodeEndpoints?: string[];
  nodePubKeys?: PointHex[];
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
  enableLogging: boolean;

  postboxKey: BN;

  serviceProviderName: string;

  encrypt(msg: Buffer): Promise<EncryptedMessage>;
  decrypt(msg: EncryptedMessage): Promise<Buffer>;
  retrievePubKey(type: PubKeyType): Buffer;
  retrievePubKeyPoint(): curve.base.BasePoint;
  getVerifierNameVerifierId(): string;
  getTSSNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }>;
  getRSSNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }>;
  getSSSNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }>;
  getTSSPubKey(tssTag: string, tssNonce: number): Promise<Point>;
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

export type InitializeNewTSSKeyResult = {
  tss2: BN;
  tssPolyCommits: Point[];
  factorPubs: Point[];
  factorEncs: {
    [factorPubID: string]: FactorEnc;
  };
};
