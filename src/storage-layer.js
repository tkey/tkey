const atob = require("atob");
const BN = require("bn.js");
const btoa = require("btoa");
const { keccak256 } = require("web3-utils");

// import { encrypt } from "eccrypto";
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
// import { ec as EC } from "elliptic";
const { post } = require("./httpHelpers");
class TorusStorageLayer {
  constructor({ enableLogging = false, hostUrl = "http://localhost:5051", serviceProvider }) {
    this.enableLogging = enableLogging;
    this.hostUrl = hostUrl;
    this.serviceProvider = serviceProvider;
  }

  async getMetadata(privKey) {
    const keyDetails = this.generateMetadataParams({}, privKey);
    let metadataResponse;
    try {
      metadataResponse = await post(`${this.hostUrl}/get`, keyDetails);
    } catch (error) {
      throw error;
    }
    return JSON.parse(atob(metadataResponse.message));
  }

  async setMetadata(encryptedDetails, privKey) {
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
      unparsedSig = this.ec.keyFromPrivate(privKey.toString("hex", 64)).sign(hash);
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
