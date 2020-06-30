const atob = require("atob");
const BN = require("bn.js");
const btoa = require("btoa");
const { keccak256 } = require("web3-utils");
const { decrypt, encrypt } = require("./utils");

const { post } = require("./httpHelpers");
class TorusStorageLayer {
  constructor({ enableLogging = false, hostUrl = "http://localhost:5051", serviceProvider }) {
    this.enableLogging = enableLogging;
    this.hostUrl = hostUrl;
    this.serviceProvider = serviceProvider;
  }

  async getMetadata(privKey) {
    const keyDetails = this.generateMetadataParams({}, privKey);
    debugger;
    let metadataResponse;
    try {
      metadataResponse = await post(`${this.hostUrl}/get`, keyDetails);
    } catch (error) {
      throw error;
    }
    let encryptedMessage;
    try {
      encryptedMessage = JSON.parse(atob(metadataResponse.message));
    } catch (err) {
      console.log(metadataResponse);
      throw err;
    }
    let decrypted;
    try {
      if (privKey) {
        decrypted = await decrypt(privKey.toPrivKeyECC(), encryptedMessage);
      } else {
        decrypted = await this.serviceProvider.decrypt(encryptedMessage);
      }
    } catch (err) {
      throw new Error(`decrypt errored in getMetadata: ${err}`);
    }
    return JSON.parse(decrypted);
  }

  async setMetadata(input, privKey) {
    const bufferMetadata = Buffer.from(JSON.stringify(input));
    let encryptedDetails;
    if (privKey) {
      encryptedDetails = await encrypt(privKey.getPubKeyECC(), bufferMetadata);
    } else {
      encryptedDetails = await this.serviceProvider.encrypt(this.serviceProvider.retrievePubKey("ecc"), bufferMetadata);
    }
    const serializedEncryptedDetails = btoa(JSON.stringify(encryptedDetails));

    const p = this.generateMetadataParams(serializedEncryptedDetails, privKey);
    let response;
    try {
      response = await post(`${this.hostUrl}/set`, p);
    } catch (err) {
      throw err;
    }
    return response;
  }

  generateMetadataParams(message, privKey) {
    let sig, pubX, pubY;
    const setData = {
      data: message,
      timestamp: new BN(Date.now()).toString(16),
    };
    let hash = keccak256(JSON.stringify(setData)).slice(2);
    if (privKey) {
      let unparsedSig = privKey.toPrivKeyEC().sign(hash);
      sig = Buffer.from(unparsedSig.r.toString(16, 64) + unparsedSig.s.toString(16, 64) + new BN(unparsedSig.v).toString(16, 2), "hex").toString(
        "base64"
      );
      let pubK = privKey.getPubKeyPoint();
      pubX = pubK.x.toString("hex");
      pubY = pubK.y.toString("hex");
    } else {
      sig = this.serviceProvider.sign(hash);
      pubX = this.serviceProvider.retrievePubKey().getX().toString("hex");
      pubY = this.serviceProvider.retrievePubKey().getY().toString("hex");
    }
    return {
      pub_key_X: pubX,
      pub_key_Y: pubY,
      set_data: setData,
      signature: sig,
    };
  }
}

module.exports = TorusStorageLayer;
