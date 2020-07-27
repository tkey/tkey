import BN from "bn.js";
// eslint-disable-next-line import/no-unresolved
import { generatePrivate } from "eccrypto";

import { IModule, IThresholdBak } from "../base/aggregateTypes";
import { getPubKeyECC } from "../base/BNUtils";
import { EncryptedMessage } from "../base/commonTypes";

class ShareTransferModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  currentEncKey: BN;

  constructor() {
    this.moduleName = "shareTransfer";
  }

  initialize(tbSDK: IThresholdBak): void {
    this.tbSDK = tbSDK;
    //   this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
  }

  async requestNewShare(): Promise<string> {
    if (this.currentEncKey) throw Error(`Current request already exists ${this.currentEncKey.toString("hex")}`);
    this.currentEncKey = new BN(generatePrivate());
    const shareTransferStore = this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as ShareTransferStore;
    let newShareTransferStore;
    if (shareTransferStore) {
      newShareTransferStore = shareTransferStore;
    } else {
      newShareTransferStore = {};
    }
    newShareTransferStore[this.currentEncKey.toString("hex")] = { encPubKey: getPubKeyECC(this.currentEncKey) } as ShareRequest;
    this.tbSDK.metadata.setGeneralStoreDomain(this.moduleName, newShareTransferStore);

    return getPubKeyECC(this.currentEncKey).toString();
  }
}

export type ShareRequest = {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;
};

// @flow
export type ShareTransferStore = {
  [encPubKeyX: string]: ShareRequest;
};

export default ShareTransferModule;
