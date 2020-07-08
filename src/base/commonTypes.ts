// eslint-disable-next-line import/no-unresolved
import { DirectWebSDKArgs } from "@toruslabs/torus-direct-web-sdk/types/src/handlers/interfaces";
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
  enableLogging: boolean;
  postboxKey: string;
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

export interface IModule {
  moduleName: string;
  initialize(): void;
}

export interface IThresholdBak {
  generateNewShare(): Promise<void>;
}

export interface IPoint {
  x: BN;
  y: BN;
  encode(enc: "arr"): Buffer;
}

export type ModuleMap = {
  [moduleName: string]: IModule;
};

export type KeyDetails = {
  pubKey: IPoint;
  requiredShares: number;

  threshold: number;
  totalShares: number;
  modules: ModuleMap;
};

export interface IServiceProvider {
  ec: EC;

  enableLogging: boolean;

  postboxKey: BN;

  encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage>;
  decrypt(msg: EncryptedMessage): Promise<Buffer>;
  retrievePubKey(type: "ecc"): Buffer | curve.base.BasePoint;
  sign(msg: BNString): string;
}
