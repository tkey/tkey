// const { decrypt, encrypt, generatePrivate, getPublic } = require("eccrypto");

const { ecCurve } = require("./utils");
const { keccak256 } = require("web3-utils");
const { BN, Share, ShareStore } = require("./types.js");

class PincodeModule {
  constructor() {
    this.moduleName = "pincode";
  }

  initialize(tbSDK) {
    this.tbSDK = tbSDK;
    // get security questions that should exist

    // expose functions here
    this.tbSDK.generateNewShareWithPincode = this.generateNewShareWithPincode.bind(this);
    this.tbSDK.getPincode = this.getPincode.bind(this);
    this.tbSDK.inputShareFromPincode = this.inputShareFromPincode.bind(this);
  }

  async generateNewShareWithPincode(pincode) {
    let newSharesDetails = await this.tbSDK.generateNewShare();
    let newShareStore = newSharesDetails.newShareStores[newSharesDetails.newShareIndex.toString("hex")];
    let userInputHash = answerToUserInputHashBN(answerString);
    
    let nonce = newShareStore.share.share.sub(userInputHash);
    nonce = nonce.umod(ecCurve.curve.n);
    let sqStore = new SecurityQuestionStore({
      nonce,
      questions,
      shareIndex: newShareStore.share.shareIndex,
      polynomialID: newShareStore.polynomialID,
    });
    this.tbSDK.metadata.setGeneralStoreDomain(this.moduleName, sqStore);
    await this.tbSDK.syncShareMetadata();
    return newSharesDetails;
  }

  getPincode() {
    let sqStore = new SecurityQuestionStore(this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName));
    return sqStore.questions;
  }

  async inputShareFromPincode(answerString) {
    let sqStore = new SecurityQuestionStore(this.tbSDK.metadata.getGeneralStoreDomain(this.moduleName));
    let userInputHash = answerToUserInputHashBN(answerString);
    let share = sqStore.nonce.add(userInputHash);
    share = share.umod(ecCurve.curve.n);
    let shareStore = new ShareStore({ share: new Share(sqStore.shareIndex, share), polynomialID: sqStore.polynomialID });
    this.tbSDK.inputShare(shareStore);
  }
}

class SecurityQuestionStore {
  constructor({ nonce, shareIndex, polynomialID, questions }) {
    if (typeof nonce === "string") {
      this.nonce = new BN(nonce, "hex");
    } else if (nonce instanceof BN) {
      this.nonce = nonce;
    } else {
      throw new TypeError(`expected nonce to be either BN or hex string instead got :${nonce}`);
    }

    if (typeof shareIndex === "string") {
      this.shareIndex = new BN(shareIndex, "hex");
    } else if (shareIndex instanceof BN) {
      this.shareIndex = shareIndex;
    } else {
      throw new TypeError(`expected shareIndex to be either BN or hex string instead got :${shareIndex}`);
    }

    if (typeof polynomialID === "string") {
      this.polynomialID = polynomialID;
    } else {
      throw new TypeError("polynomialID msut be string");
    }
    if (typeof questions === "string") {
      this.questions = questions;
    } else {
      throw new TypeError("polynomialID msut be string");
    }
  }
}

module.exports = SecurityQuestionsModule;
