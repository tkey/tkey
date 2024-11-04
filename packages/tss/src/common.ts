import { Point, TkeyStoreItemType } from "@tkey/common-types";
import { EncryptedMessage, PointHex } from "@toruslabs/rss-client";
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

export interface refreshRemoteTssType {
  // from client
  factorEnc: FactorEnc;

  factorPubs: Point[];
  targetIndexes: number[];
  verifierNameVerifierId: string;

  tssTag: string;
  tssCommits: Point[];
  tssNonce: number;
  newTSSServerPub: Point;
  // nodeIndexes : number[],

  serverOpts: {
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
    selectedServers: number[];
    authSignatures: string[];
  };
}

export interface RefreshRemoteTssReturnType {
  tssTag: string;
  tssNonce: number;
  tssPolyCommits: Point[];
  factorPubs: Point[];
  factorEncs: {
    [factorPubID: string]: FactorEnc;
  };
}
