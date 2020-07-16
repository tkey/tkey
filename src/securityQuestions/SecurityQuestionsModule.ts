import BN from "bn.js";
import { keccak256 } from "web3-utils";

import { GenerateNewShareResult, IModule, IThresholdBak } from "../base/aggregateTypes";
import { SecurityQuestionStoreArgs } from "../base/commonTypes";
import Share from "../base/Share";
import ShareStore, { ShareStoreMap } from "../base/ShareStore";
import { ecCurve } from "../utils";
import SecurityQuestionStore from "./SecurityQuestionStore";

function answerToUserInputHashBN(answerString) {
  return new BN(keccak256(answerString).slice(2), "hex");
}

class SecurityQuestionsModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  constructor() {
    this.moduleName = "securityQuestions";
  }

  initialize(tbSDK: IThresholdBak) {
    this.tbSDK = tbSDK;
  }

  async generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult> {
    const newSharesDetails = await this.tbSDK.generateNewShare();
    const newShareStore = newSharesDetails.newShareStores[newSharesDetails.newShareIndex.toString("hex")];
    const userInputHash = answerToUserInputHashBN(answerString);
    let nonce = newShareStore.share.share.sub(userInputHash);
    nonce = nonce.umod(ecCurve.curve.n);
    const sqStore = new SecurityQuestionStore({
      nonce,
      questions,
      shareIndex: newShareStore.share.shareIndex,
      polynomialID: newShareStore.polynomialID,
    });
    this.tbSDK.metadata.setGeneralStoreDomain(this.moduleName, sqStore);
    await this.tbSDK.syncShareMetadata();
    return newSharesDetails;
  }

  getSecurityQuestions(): string {
    const sqStore = new SecurityQuestionStore(this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as SecurityQuestionStoreArgs);
    return sqStore.questions;
  }

  async inputShareFromSecurityQuestions(answerString: string): Promise<void> {
    const sqStore = new SecurityQuestionStore(this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as SecurityQuestionStoreArgs);
    const userInputHash = answerToUserInputHashBN(answerString);
    let share = sqStore.nonce.add(userInputHash);
    share = share.umod(ecCurve.curve.n);
    const shareStore = new ShareStore({ share: new Share(sqStore.shareIndex, share), polynomialID: sqStore.polynomialID });
    this.tbSDK.inputShare(shareStore);
  }

  refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown {
    const sqStore = new SecurityQuestionStore(generalStore as SecurityQuestionStoreArgs);
    const sqAnswer = oldShareStores[sqStore.shareIndex.toString("hex")].share.share.sub(sqStore.nonce);
    const newNonce = newShareStores[sqStore.shareIndex.toString("hex")].share.share.sub(sqAnswer);

    return new SecurityQuestionStore({
      nonce: newNonce,
      polynomialID: newShareStores[Object.keys(newShareStores)[0]].polynomialID,
      shareIndex: sqStore.shareIndex,
      questions: sqStore.questions,
    });
  }
}

export default SecurityQuestionsModule;
