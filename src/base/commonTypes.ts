import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";

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

export interface SecurityQuestionStoreArgs {
  nonce: BNString;

  shareIndex: BNString;

  polynomialID: PolynomialID;

  questions: string;
}

export interface IPoint {
  x: BN;
  y: BN;
  encode(enc: "arr"): Buffer;
}

export interface IServiceProvider {
  ec: EC;

  enableLogging: boolean;

  postboxKey: BN;

  encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage>;
  decrypt(msg: EncryptedMessage): Promise<Buffer>;
  retrievePubKey(type?: "ecc"): Buffer | curve.base.BasePoint;
  sign(msg: BNString): string;
}

export interface IStorageLayer {
  enableLogging: boolean;

  hostUrl: string;

  serviceProvider: IServiceProvider;

  getMetadata<T>(privKey?: BN): Promise<T>;

  setMetadata<T>(input: T, privKey?: BN): Promise<{ message: string }>;

  generateMetadataParams(message: unknown, privKey: BN): TorusStorageLayerAPIParams;
}

export type TorusStorageLayerArgs = {
  enableLogging?: boolean;
  hostUrl?: string;
  serviceProvider: IServiceProvider;
};

export type TorusStorageLayerAPIParams = {
  pub_key_X: string;
  pub_key_Y: string;
  set_data: unknown;
  signature: Buffer;
};

export type RefreshMiddlewareMap = {
  [moduleName: string]: (generalStore: unknown) => unknown;
};
