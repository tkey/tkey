const Torus = require("@toruslabs/torus.js");
const { BN } = require("./types.js");
const { decrypt, encrypt } = require("./utils");
const decryptUtils = decrypt;
const encryptUtils = encrypt;
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
const { ec } = require("elliptic");

const EC = ec;

class TorusServiceProvider {
  constructor({ enableLogging = false, postboxKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d" } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.postboxKey = new BN(postboxKey, 16);
    this.ecPostboxKey = this.ec.keyFromPrivate(this.postboxKey.toString("hex", 64));
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
    return this.ecPostboxKey.getPublic();
  }

  sign(msg) {
    const sig = this.ecPostboxKey.sign(msg);
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(sig.v).toString(16, 2), "hex").toString("base64");
  }
}

module.exports = TorusServiceProvider;
