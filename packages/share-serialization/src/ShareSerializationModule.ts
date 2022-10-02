import { IModule, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import { english } from "./english";
import ShareSerializationError from "./errors";
import { entropyToMnemonic, mnemonicToEntropy } from "./utils";

export const SHARE_SERIALIZATION_MODULE_NAME = "shareSerialization";

class ShareSerializationModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = SHARE_SERIALIZATION_MODULE_NAME;
  }

  static serializeMnemonic(share: BN): string {
    return entropyToMnemonic(share.toString("hex").padStart(64, "0"), english);
  }

  static serializeTSSMnemonic(share: BN, tssShare: BN): string {
    const shareMnemonic = entropyToMnemonic(share.toString("hex").padStart(64, "0"), english);
    const tssShareMnemonic = entropyToMnemonic(tssShare.toString("hex").padStart(64, "0"), english);
    return `${shareMnemonic} | ${tssShareMnemonic}`;
  }

  static deserializeMnemonic(share: string): BN {
    return new BN(mnemonicToEntropy(share, english), "hex");
  }

  static deserializeTSSMnemonic(shareAndTSSShare: string): { share: BN; tssShare: BN } {
    const [shareMnemonic, tssShareMnemonic] = shareAndTSSShare.split(" | ");
    return { share: new BN(mnemonicToEntropy(shareMnemonic, english), "hex"), tssShare: new BN(mnemonicToEntropy(tssShareMnemonic, english), "hex") };
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK._addShareSerializationMiddleware(this.serialize.bind(this), this.deserialize.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async serialize(share: BN, type: string, tssShare?: BN): Promise<unknown> {
    if (type === "mnemonic") {
      if (tssShare) {
        return ShareSerializationModule.serializeTSSMnemonic(share, tssShare);
      }
      return ShareSerializationModule.serializeMnemonic(share);
    }
    throw ShareSerializationError.typeNotSupported();
  }

  async deserialize(serialized: unknown, type: string): Promise<{ share: BN; tssShare?: BN }> {
    if (type === "mnemonic") {
      if ((serialized as string).indexOf("|") > -1) {
        return ShareSerializationModule.deserializeTSSMnemonic(serialized as string);
      }
      return { share: ShareSerializationModule.deserializeMnemonic(serialized as string) };
    }
    throw ShareSerializationError.typeNotSupported();
  }
}

export default ShareSerializationModule;
