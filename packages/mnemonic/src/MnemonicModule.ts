import { BNString, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import { english } from "./english";
import { entropyToMnemonic, mnemonicToEntropy } from "./utils";

export const MNEMONIC_MODULE_NAME = "mnemonic";

class MnemonicModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = MNEMONIC_MODULE_NAME;
  }

  async importShare(tkey: ITKeyApi, mnemonic: string) {
    const entrophy = new BN(mnemonicToEntropy(mnemonic, english), "hex");
    return tkey.inputShare(entrophy);
  }

  async exportShare(tkey: ITKeyApi, shareIndex: BNString) {
    const share = (await tkey.outputShare(shareIndex)) as BN;
    return entropyToMnemonic(share.toString("hex").padStart(64, "0"), english);
  }
}

export default MnemonicModule;
