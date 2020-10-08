import { IModule, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import { english } from "./english";
import { entropyToMnemonic, mnemonicToEntropy } from "./utils";

export const SHARE_SERIALIZATION_MODULE = "shareSerializationModule";

class ShareSerializationModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  english: string[];

  constructor() {
    this.moduleName = SHARE_SERIALIZATION_MODULE;
    this.english = english as string[];
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> { }

  serialize(share: BN, type: string): string {
    if (type === "mnemonic") return this.serializeMnemonic(share);
    throw new Error("Type is not supported");
  }

  deserialize(share: unknown, type: string): BN {
    if (type === "mnemonic") return this.deserializeMnemonic(share as string);
    throw new Error("Type is not supported");
  }

  serializeMnemonic(share: BN): string {
    return entropyToMnemonic(share.toString("hex"), this.english);
  }

  deserializeMnemonic(share: string): BN {
    return new BN(mnemonicToEntropy(share, this.english), "hex");
  }
}

export default ShareSerializationModule;
