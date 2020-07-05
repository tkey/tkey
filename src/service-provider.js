const { BN } = require("./types.js");
const { decrypt, encrypt } = require("./utils");
const decryptUtils = decrypt;
const encryptUtils = encrypt;
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
const { ec } = require("elliptic");

const DirectWebSDK = require("@toruslabs/torus-direct-web-sdk");

const EC = ec;

class TorusServiceProvider {
  constructor({ enableLogging = false, postboxKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d", directParams } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, 16);
    this.directWeb = new DirectWebSDK(directParams);

    // this.triggerAggregateLogin = this.directWeb.triggerAggregateLogin.bind(this.directWeb);
  }

  async triggerAggregateLogin(params) {
    const obj = await this.directWeb.triggerAggregateLogin(params);
    this.postboxKey = new BN(obj.privateKey, "hex");
    return obj;
  }

  async encrypt(publicKey, msg) {
    let encryptedDetails;
    try {
      encryptedDetails = await encryptUtils(publicKey, msg);
    } catch (err) {
      throw err;
    }
    return encryptedDetails;
  }

  async decrypt(msg) {
    let decryption;
    try {
      decryption = await decryptUtils(this.postboxKey.toPrivKeyECC(), msg);
    } catch (err) {
      return err;
    }
    return decryption;
  }

  retrievePubKey(type) {
    if (type === "ecc") {
      return this.postboxKey.getPubKeyECC();
    }
    return this.postboxKey.toPrivKeyEC().getPublic();
  }

  sign(msg) {
    const sig = this.postboxKey.toPrivKeyEC().sign(msg);
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(sig.v).toString(16, 2), "hex").toString("base64");
  }
}

module.exports = TorusServiceProvider;
