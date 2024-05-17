import { Point, TkeyStoreItemType } from "@tkey/common-types";
import { EncryptedMessage } from "@toruslabs/rss-client";
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
