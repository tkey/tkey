import BN from "bn.js";
import { keccak256 } from "web3-utils";

import { GenerateNewShareResult, IModule, IThresholdBak, SecurityQuestionStoreArgs } from "../base/aggregateTypes";
import Share from "../base/Share";
import ShareStore, { ShareStoreMap } from "../base/ShareStore";
import { ecCurve, isEmptyObject } from "../utils";
import SecurityQuestionStore from "./SecurityQuestionStore";

function answerToUserInputHashBN(answerString) {
  return new BN(keccak256(answerString).slice(2), "hex");
}

// password + nonce = share
// password has changed to password2

// password2 + newNonce = share

class SecurityQuestionsModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  constructor() {
    this.moduleName = "securityQuestions";
  }

  async initialize(tbSDK: IThresholdBak): Promise<void> {
    this.tbSDK = tbSDK;
    this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
  }

  async generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult> {
    const oldSqStore = new SecurityQuestionStore(this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as SecurityQuestionStoreArgs);
    if (isEmptyObject(oldSqStore)) throw Error("sqStore doesnt exist, has tKey SDK been initialized with metadata?");
    const newSharesDetails = await this.tbSDK.generateNewShare();
    await this.tbSDK.addShareDescription(newSharesDetails.newShareIndex.toString("hex"), JSON.stringify({ module: this.moduleName, questions }));
    const newShareStore = newSharesDetails.newShareStores[newSharesDetails.newShareIndex.toString("hex")];
    const userInputHash = answerToUserInputHashBN(answerString);
    let nonce = newShareStore.share.share.sub(userInputHash);
    nonce = nonce.umod(ecCurve.curve.n);
    const sqStore = new SecurityQuestionStore({
      nonce,
      questions,
      sqPublicShare: newShareStore.share.getPublicShare(),
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
    if (isEmptyObject(sqStore)) throw Error("sqStore doesnt exist, has tKey SDK been initialized with metadata?");
    const userInputHash = answerToUserInputHashBN(answerString);
    let share = sqStore.nonce.add(userInputHash);
    share = share.umod(ecCurve.curve.n);
    const shareStore = new ShareStore({ share: new Share(sqStore.shareIndex, share), polynomialID: sqStore.polynomialID });
    // validate if share is correct
    const derivedPublicShare = shareStore.share.getPublicShare();
    if (derivedPublicShare.shareCommitment.x.cmp(sqStore.sqPublicShare.shareCommitment.x) !== 0) {
      throw Error("wrong password");
    }

    const latestShareDetails = await this.tbSDK.catchupToLatestShare(shareStore);
    // TODO: update share nonce on all metadata. would be cleaner in long term?
    // if (shareStore.polynomialID !== latestShareDetails.latestShare.polynomialID) this.storeDeviceShare(latestShareDetails.latestShare);
    this.tbSDK.inputShare(latestShareDetails.latestShare);
  }

  async changeSecurityQuestionAndAnswer(newAnswerString: string, newQuestions: string): Promise<void> {
    const sqStore = new SecurityQuestionStore(this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName) as SecurityQuestionStoreArgs);
    if (isEmptyObject(sqStore)) throw Error("security questions might not exist/be setup");

    const userInputHash = answerToUserInputHashBN(newAnswerString);
    const sqShare = this.tbSDK.outputShare(sqStore.shareIndex);
    let nonce = sqShare.share.share.sub(userInputHash);
    nonce = nonce.umod(ecCurve.curve.n);

    const newSqStore = new SecurityQuestionStore({
      nonce,
      polynomialID: sqStore.polynomialID,
      sqPublicShare: sqStore.sqPublicShare,
      shareIndex: sqStore.shareIndex,
      questions: newQuestions,
    });
    await this.tbSDK.metadata.setGeneralStoreDomain(this.moduleName, newSqStore);
    await this.tbSDK.syncShareMetadata();
  }

  refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown {
    if (generalStore === undefined || isEmptyObject(generalStore)) {
      return generalStore;
    }
    const sqStore = new SecurityQuestionStore(generalStore as SecurityQuestionStoreArgs);
    const sqAnswer = oldShareStores[sqStore.shareIndex.toString("hex")].share.share.sub(sqStore.nonce);
    let newNonce = newShareStores[sqStore.shareIndex.toString("hex")].share.share.sub(sqAnswer);
    newNonce = newNonce.umod(ecCurve.curve.n);

    return new SecurityQuestionStore({
      nonce: newNonce,
      polynomialID: newShareStores[Object.keys(newShareStores)[0]].polynomialID,
      sqPublicShare: newShareStores[sqStore.shareIndex.toString("hex")].share.getPublicShare(),
      shareIndex: sqStore.shareIndex,
      questions: sqStore.questions,
    });
  }
}

export default SecurityQuestionsModule;
