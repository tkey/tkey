import { IModule, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import { english } from "./english";
import { entropyToMnemonic, mnemonicToEntropy } from "./utils";

export const IMPORT_EXPORT_MODULE_NAME = "importExportModule";

class ImportExportModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  english: string[];

  constructor() {
    this.moduleName = IMPORT_EXPORT_MODULE_NAME;
    this.english = english as string[];
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  shareToMnemonic(share: BN): string {
    return entropyToMnemonic(share.toString("hex"), this.english);
  }

  mnemonicToShare(seed: string): BN {
    return new BN(mnemonicToEntropy(seed, this.english), "hex");
  }
}

export default ImportExportModule;
