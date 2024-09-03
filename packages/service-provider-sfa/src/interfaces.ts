import { type ServiceProviderArgs } from "@tkey/common-types";
import { type TORUS_NETWORK_TYPE } from "@toruslabs/constants";
import { KeyType } from "@toruslabs/torus.js";

export interface Web3AuthOptions {
  clientId: string;
  network: TORUS_NETWORK_TYPE;
  /**
   * Set this flag to false to generate keys on client side
   * by default keys are generated on using dkg protocol on a distributed network
   * @defaultValue undefined
   */
  useDkg?: boolean;
  keyType?: KeyType;
}
export interface SfaServiceProviderArgs extends ServiceProviderArgs {
  web3AuthOptions: Web3AuthOptions;
}

export interface TorusSubVerifierInfo {
  verifier: string;
  idToken: string;
}

export type AggregateVerifierParams = {
  verify_params: { verifier_id: string; idtoken: string }[];
  sub_verifier_ids: string[];
  verifier_id: string;
};

export type LoginParams = {
  verifier: string;
  verifierId: string;
  idToken: string;
  subVerifierInfoArray?: TorusSubVerifierInfo[];
  // offset in seconds
  serverTimeOffset?: number;
};
