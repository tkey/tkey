import Torus from "@toruslabs/torus.js";

// import BN from "bn.js";
// import { encrypt } from "eccrypto";
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
// import { ec as EC } from "elliptic";
import { post } from "./httpHelpers";

class TorusStorageLayer {
  constructor({ enableLogging = false, hostUrl = "https://metadata.tor.us" }) {
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.hostUrl = hostUrl;
  }

  async getMetadata() {
    const keyDetails = this.torus.generateMetadataParams({}, this.privKey);
    let metadataResponse;
    try {
      metadataResponse = await post(`${this.hostUrl}/get`, keyDetails);
    } catch (error) {
      return error;
    }
    return metadataResponse;
  }

  async setMetadata(encryptedDetails) {
    const serializedEncryptedDetails = Buffer.from(JSON.stringify(encryptedDetails)).toString("base64");
    const p = this.torus.generateMetadataParams(serializedEncryptedDetails, this.peggedKey);
    let response;
    try {
      response = await post(`${this.hostUrl}/set`, p);
    } catch (err) {
      return err;
    }
    return response;
  }
}

export default TorusStorageLayer;
