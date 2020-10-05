import {
  ecCurve,
  GenerateNewShareResult,
  IModule,
  isEmptyObject,
  ITKeyApi,
  SecurityQuestionStoreArgs,
  Share,
  ShareStore,
  ShareStoreMap,
} from "@tkey/types";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

import SecurityQuestionStore from "./SecurityQuestionStore";

function answerToUserInputHashBN(answerString: string): BN {
  return new BN(keccak256(answerString).slice(2), "hex");
}

export const SECURITY_QUESTIONS_MODULE_NAME = "securityQuestions";

// password + nonce = share
// password has changed to password2

// password2 + newNonce = share

class SecurityQuestionsModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = SECURITY_QUESTIONS_MODULE_NAME;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK.addRefreshMiddleware(this.moduleName, SecurityQuestionsModule.refreshSecurityQuestionsMiddleware);
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async generateNewShareWithSecurityQuestions(answerString: string, questions: string): Promise<GenerateNewShareResult> {
    const metadata = this.tbSDK.getMetadata();
    const rawSqStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (rawSqStore) throw new Error("security questions exists, cant replace, maybe change?");

    const newSharesDetails = await this.tbSDK.generateNewShare();
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
    metadata.setGeneralStoreDomain(this.moduleName, sqStore);
    await this.tbSDK.addShareDescription(
      newSharesDetails.newShareIndex.toString("hex"),
      JSON.stringify({ module: this.moduleName, questions, dateAdded: Date.now() }),
      true // sync metadata
    );
    return newSharesDetails;
  }

  getSecurityQuestions(): string {
    const metadata = this.tbSDK.getMetadata();
    const sqStore = new SecurityQuestionStore(metadata.getGeneralStoreDomain(this.moduleName) as SecurityQuestionStoreArgs);
    return sqStore.questions;
  }

  async inputShareFromSecurityQuestions(answerString: string): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const rawSqStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawSqStore) throw new Error("security questions might not exist/be setup");
    const sqStore = new SecurityQuestionStore(rawSqStore as SecurityQuestionStoreArgs);
    const userInputHash = answerToUserInputHashBN(answerString);
    let share = sqStore.nonce.add(userInputHash);
    share = share.umod(ecCurve.curve.n);
    const shareStore = new ShareStore(new Share(sqStore.shareIndex, share), sqStore.polynomialID);
    // validate if share is correct
    const derivedPublicShare = shareStore.share.getPublicShare();
    if (derivedPublicShare.shareCommitment.x.cmp(sqStore.sqPublicShare.shareCommitment.x) !== 0) {
      throw new Error("wrong password");
    }

    const latestShareDetails = await this.tbSDK.catchupToLatestShare(shareStore);
    // TODO: update share nonce on all metadata. would be cleaner in long term?
    // if (shareStore.polynomialID !== latestShareDetails.latestShare.polynomialID) this.storeDeviceShare(latestShareDetails.latestShare);
    this.tbSDK.inputShare(latestShareDetails.latestShare);
  }

  async changeSecurityQuestionAndAnswer(newAnswerString: string, newQuestions: string): Promise<void> {
    const metadata = this.tbSDK.getMetadata();
    const rawSqStore = metadata.getGeneralStoreDomain(this.moduleName);
    if (!rawSqStore) throw new Error("security questions might not exist/be setup");
    const sqStore = new SecurityQuestionStore(rawSqStore as SecurityQuestionStoreArgs);

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
    metadata.setGeneralStoreDomain(this.moduleName, newSqStore);
    await this.tbSDK.syncShareMetadata();
  }

  static refreshSecurityQuestionsMiddleware(generalStore: unknown, oldShareStores: ShareStoreMap, newShareStores: ShareStoreMap): unknown {
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
