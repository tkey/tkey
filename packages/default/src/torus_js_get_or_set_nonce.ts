import { KeyType, keyTypeToCurve } from "@tkey/common-types";
// eslint-disable-next-line import/no-extraneous-dependencies
import { post } from "@toruslabs/http-helpers";
import BN from "bn.js";
// eslint-disable-next-line import/no-extraneous-dependencies
import { keccak256 } from "ethereum-cryptography/keccak";
// eslint-disable-next-line import/no-extraneous-dependencies
import stringify from "json-stable-stringify";

// TODO: THIS FILE MUST BE REMOVED WHEN torus.js has been updated.

export type UserType = "v1" | "v2";
export type v2NonceResultType = { typeOfUser: "v2"; nonce?: string; pubNonce: { x: string; y: string }; ipfs?: string; upgraded: boolean };

export type v1NonceResultType = { typeOfUser: "v1"; nonce?: string };
export type GetOrSetNonceResult = v2NonceResultType | v1NonceResultType;

export class GetOrSetNonceError extends Error {}

export interface Data {}

export interface SetNonceData {
  operation: string;
  data: string;
  timestamp: string;
}

export interface NonceMetadataParams {
  namespace?: string;
  pub_key_X: string;
  pub_key_Y: string;
  set_data: Partial<SetNonceData>;
  signature: string;
  key_type?: KeyType;
}

export interface MetadataParams {
  namespace?: string;
  pub_key_X: string;
  pub_key_Y: string;
  key_type?: KeyType;
  set_data: {
    data: "getNonce" | "getOrSetNonce" | string;
    timestamp: string;
  };
  signature: string;
}

export function generateMetadataParams(serverTimeOffset: number, message: string, privateKey: BN, keyType: KeyType): MetadataParams {
  const ec = keyTypeToCurve(keyType);
  const key = ec.keyFromPrivate(privateKey.toString("hex", 64), "hex");
  const setData = {
    data: message,
    timestamp: new BN(~~(serverTimeOffset + Date.now() / 1000)).toString(16),
  };
  const sig = key.sign(keccak256(Buffer.from(stringify(setData), "utf8")).slice(2));
  return {
    pub_key_X: key.getPublic().getX().toString("hex"), // DO NOT PAD THIS. BACKEND DOESN'T
    pub_key_Y: key.getPublic().getY().toString("hex"), // DO NOT PAD THIS. BACKEND DOESN'T
    set_data: setData,
    key_type: keyType,
    signature: Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN("").toString(16, 2), "hex").toString("base64"),
  };
}

export async function getOrSetNonce(
  legacyMetadataHost: string,
  serverTimeOffset: number,
  X: string,
  Y: string,
  keyType: KeyType,
  privKey?: BN,
  getOnly = false
): Promise<GetOrSetNonceResult> {
  let data: Data;
  const msg = getOnly ? "getNonce" : "getOrSetNonce";
  if (privKey) {
    data = generateMetadataParams(serverTimeOffset, msg, privKey, keyType);
  } else {
    data = {
      pub_key_X: X,
      pub_key_Y: Y,
      set_data: { data: msg },
      keyType,
    };
  }
  return post<GetOrSetNonceResult>(`${legacyMetadataHost}/get_or_set_nonce`, data, undefined, { useAPIKey: true });
}
