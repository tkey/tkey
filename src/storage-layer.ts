import { post } from "@toruslabs/http-helpers";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

import { IServiceProvider } from "./base/commonTypes";
import { decrypt, encrypt } from "./utils";

interface IStorageLayer {}

class TorusStorageLayer {
  enableLogging: boolean;

  hostUrl: string;

  serviceProvider: IServiceProvider;

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
    // returns empty object if objec
    if (metadataResponse.message === "") {
      return {};
    }
    let encryptedMessage;
    try {
      encryptedMessage = JSON.parse(atob(metadataResponse.message));
    } catch (err) {
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
    let sig;
    let pubX;
    let pubY;
    const setData = {
      data: message,
      timestamp: new BN(Date.now()).toString(16),
    };
    const hash = keccak256(JSON.stringify(setData)).slice(2);
    if (privKey) {
      const unparsedSig = privKey.toPrivKeyEC().sign(hash);
      sig = Buffer.from(unparsedSig.r.toString(16, 64) + unparsedSig.s.toString(16, 64) + new BN(unparsedSig.v).toString(16, 2), "hex").toString(
        "base64"
      );
      const pubK = privKey.getPubKeyPoint();
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

export default TorusStorageLayer;
