import type { CustomAuthArgs } from "@toruslabs/customauth";
import BN from "bn.js";
import { curve, ec, ec as EllipticCurve } from "elliptic";

export enum KeyType {
  secp256k1 = "secp256k1",
  ed25519 = "ed25519",
}
const curveED25519 = new EllipticCurve("ed25519");
const curveSECP256K1 = new EllipticCurve("secp256k1");

export function keyTypeToCurve(keyType: KeyType): EllipticCurve {
  switch (keyType) {
    case KeyType.ed25519:
      return curveED25519;
    case KeyType.secp256k1:
      return curveSECP256K1;
    default:
      throw new Error("Invalid key type");
  }
}

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
export interface ServiceProviderArgs {
  enableLogging?: boolean;
  postboxKey?: string;
  keyType?: KeyType;
}

export interface TorusServiceProviderArgs extends ServiceProviderArgs {
  customAuthArgs: CustomAuthArgs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StringifiedType = Record<string, any>;

export interface ISerializable {
  toJSON(): StringifiedType;
}

export interface IPoint extends ISerializable {
  x: BN;
  y: BN;
  toSEC1(compressed: boolean): string;
}

export interface IServiceProvider extends ISerializable {
  enableLogging: boolean;

  postboxKey: BN;

  keyType: KeyType;

  serviceProviderName: string;

  encrypt(msg: Buffer, keyType: KeyType): Promise<EncryptedMessage>;
  decrypt(msg: EncryptedMessage, keyType: KeyType): Promise<Buffer>;
  retrievePubKey(type: PubKeyType): Buffer;
  retrievePubKeyPoint(): curve.base.BasePoint;
  sign(msg: BNString): string;
  metadataSign(msg: BNString): {
    signer: ec.KeyPair;
    sig: string;
    pubX: string;
    pubY: string;
  };
}
export type TorusStorageLayerAPIParams = {
  pub_key_X: string;
  pub_key_Y: string;
  set_data: unknown;
  signature: string;
  namespace: string;
  key_type: string;
};

export interface IStorageLayer extends ISerializable {
  storageLayerName: string;

  getMetadata<T>(params: { serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<T>;

  setMetadata<T>(params: { input: T; serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<{ message: string }>;

  setMetadataStream<T>(params: { input: T[]; serviceProvider?: IServiceProvider; privKey?: BN[]; keyType: KeyType }): Promise<{ message: string }>;

  acquireWriteLock(params: { serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<{ status: number; id?: string }>;

  releaseWriteLock(params: { id: string; serviceProvider?: IServiceProvider; privKey?: BN; keyType: KeyType }): Promise<{ status: number }>;
}

export type TorusStorageLayerArgs = {
  enableLogging?: boolean;
  hostUrl?: string;
  serverTimeOffset?: number;
};

export type MockStorageLayerArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataMap: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lockMap: any;
};

export type ShareDescriptionMap = {
  [shareIndexStr: string]: string[];
};

export type FromJSONConstructor = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fromJSON(value: StringifiedType): any;
};

export type DeviceShareDescription = { module: string; userAgent: string; dateAdded: number; customDeviceInfo?: string };

// This has to be fixed to secp256k1 for now because it is being used in
// combination with eccrypto's `encrypt` and `decrypt`, which is secp256k1 only.
export const FACTOR_KEY_TYPE = KeyType.secp256k1;

export declare const DEFAULT_KEY_TYPE = KeyType.secp256k1;
