const atob = require("atob");
const BN = require("bn.js");
const btoa = require("btoa");
const { keccak256 } = require("web3-utils");

// import { encrypt } from "eccrypto";
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
// import { ec as EC } from "elliptic";
const { post } = require("./httpHelpers");
class TorusStorageLayer {
  constructor({ enableLogging = false, hostUrl = "https://metadata.tor.us", serviceProvider }) {
    this.enableLogging = enableLogging;
    this.hostUrl = hostUrl;
    this.serviceProvider = serviceProvider;
  }

  async getMetadata() {
    const keyDetails = this.generateMetadataParams({});
    let metadataResponse;
    try {
      metadataResponse = await post(`${this.hostUrl}/get`, keyDetails);
    } catch (error) {
      return error;
    }
    return JSON.parse(atob(metadataResponse.message));
  }

  async setMetadata(encryptedDetails) {
    const serializedEncryptedDetails = btoa(JSON.stringify(encryptedDetails));
    const p = this.generateMetadataParams(serializedEncryptedDetails);
    let response;
    try {
      response = await post(`${this.hostUrl}/set`, p);
    } catch (err) {
      return err;
    }
    return response;
  }

  generateMetadataParams(message) {
    const setData = {
      data: message,
      timestamp: new BN(Date.now()).toString(16),
    };
    const sig = this.serviceProvider.sign(keccak256(JSON.stringify(setData)).slice(2));
    return {
      pub_key_X: this.serviceProvider.retrievePubKey().getX().toString("hex"),
      pub_key_Y: this.serviceProvider.retrievePubKey().getY().toString("hex"),
      set_data: setData,
      signature: sig,
    };
  }
}

module.exports = TorusStorageLayer;
