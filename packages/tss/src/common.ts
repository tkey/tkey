import { Point, TkeyStoreItemType } from "@tkey/common-types";
import { EncryptedMessage, PointHex } from "@toruslabs/rss-client";
import { KeyType } from "@toruslabs/torus.js";
import BN from "bn.js";

export type FactorEncType = "direct" | "hierarchical";

export type FactorEnc = {
  tssIndex: number;
  type: FactorEncType;
  userEnc: EncryptedMessage;
  serverEncs: EncryptedMessage[];
};

export type InitializeNewTSSKeyResult = {
  tss2: BN;
  tssPolyCommits: Point[];
  factorPubs: Point[];
  factorEncs: {
    [factorPubID: string]: FactorEnc;
  };
};

export type IAccountSaltStore = TkeyStoreItemType & {
  value: string;
};

export interface IRemoteClientState {
  remoteFactorPub: string;
  remoteClientUrl: string;
  remoteClientToken: string;
  metadataShare: string;
  tssShareIndex: number;
  // Signatures for authentication against RSS servers
  signatures: string[];
}

export interface RefreshRemoteTssParams {
  // from client
  factorEnc: FactorEnc;

  factorPubs: PointHex[];
  targetIndexes: number[];
  verifierNameVerifierId: string;

  tssTag: string;
  tssCommits: PointHex[];
  tssNonce: number;
  newTSSServerPub: PointHex;
  // nodeIndexes : number[],

  serverOpts: {
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
    selectedServers: number[];
    authSignatures: string[];
  };

  curve: KeyType;
}

export interface RefreshRemoteTssReturnType {
  tssTag: string;
  tssNonce: number;
  tssPolyCommits: PointHex[];
  factorPubs: PointHex[];
  factorEncs: {
    [factorPubID: string]: FactorEnc;
  };
}

export interface CopyRemoteTssParams {
  tssCommits: PointHex[];
  factorPub: PointHex;
  factorEnc: FactorEnc;
  curve: KeyType;
}
