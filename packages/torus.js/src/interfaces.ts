import { Ecies } from "@toruslabs/eccrypto";
import BN from "bn.js";

export type GetOrSetNonceResult =
  | { typeOfUser: "v1"; nonce?: string }
  | { typeOfUser: "v2"; nonce?: string; pubNonce: { x: string; y: string }; ipfs?: string; upgraded: boolean };

export interface MetadataResponse {
  message: string;
}

export interface MetadataParams {
  namespace?: string;
  pub_key_X: string;
  pub_key_Y: string;
  set_data: {
    data: "getNonce" | "getOrSetNonce" | string;
    timestamp: string;
  };
  signature: string;
}

export interface TorusCtorOptions {
  enableOneKey?: boolean;
  metadataHost?: string;
  serverTimeOffset?: number;
  network?: string;
  blsdkg?: {
    init: any;
    interpolate: (indexes: Uint8Array[], shares: Uint8Array[]) => Uint8Array;
    get_pk: (privKey: Uint8Array) => Uint8Array;
  };
}

export interface ShareResponse {
  ethAddress: string;
  privKey: string;
  metadataNonce: BN;
}

export interface VerifierLookupResponse {
  keys: { pub_key_X: string; pub_key_Y: string; key_index: string; address: string }[];
}

export interface CommitmentRequestResult {
  signature: string;
  data: string;
  nodepubx: string;
  nodepuby: string;
}

export interface KeyAssignCommitmentRequestResult {
  data: string;
  nodepubx: string;
  nodepuby: string;
  signature: string;
  verifierIdSignature: string;
}
export type MapNewVeririerIdCommitmentRequestResult = KeyAssignCommitmentRequestResult;

export interface SetCustomKeyOptions {
  privKeyHex?: string;
  metadataNonce?: BN;
  torusKeyHex?: string;
  customKeyHex: BN;
}

export interface JRPCResponse<T> {
  id: number;
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface KeyLookupResult {
  keyResult: VerifierLookupResponse;
  errorResult: JRPCResponse<VerifierLookupResponse>["error"];
}

export interface SignerResponse {
  "torus-timestamp": string;
  "torus-nonce": string;
  "torus-signature": string;
}

export interface KeyAssignment {
  PublicKey: string;
  Share: string;
  Metadata: {
    [key in keyof Ecies]: string;
  };
}

export interface RetrieveSharesResponse {
  privKey: string;
}

export interface VerifierParams {
  [key: string]: unknown;
  verifier_id: string;
  verifier: string;
}
