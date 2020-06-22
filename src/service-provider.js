const Torus = require("@toruslabs/torus.js");
const BN = require("bn.js");
const { decrypt, encrypt } = require("eccrypto");
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
const { ec } = require("elliptic");

const EC = ec;

const { privKeyBnToEcc } = require("./utils");

const ecEncrypt = encrypt;
const ecDecrypt = decrypt;

class TorusServiceProvider {
  constructor({ enableLogging = false, postboxKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d" } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.postboxKey = new BN(postboxKey, 16);
    this.ecPostboxKey = this.ec.keyFromPrivate(this.postboxKey.toString("hex", 64));
  }

  // TODO: convert not to use ecc publicKey
  async encrypt(publicKey, msg) {
    console.log("encryption args", arguments);
    let encryptedDetails;
    try {
      encryptedDetails = await ecEncrypt(publicKey, msg);
    } catch (err) {
      throw err;
    }

    console.log("encryption", JSON.stringify(encryptedDetails));
    return {
      ciphertext: encryptedDetails.ciphertext.toString("hex"),
      ephemPublicKey: encryptedDetails.ephemPublicKey.toString("hex"),
      iv: encryptedDetails.iv.toString("hex"),
      mac: encryptedDetails.mac.toString("hex"),
    };
  }

  // TODO: convert not to use ecc private key
  async decrypt(msg) {
    const bufferEncDetails = {
      ciphertext: Buffer.from(msg.ciphertext, "hex"),
      ephemPublicKey: Buffer.from(msg.ephemPublicKey, "hex"),
      iv: Buffer.from(msg.iv, "hex"),
      mac: Buffer.from(msg.mac, "hex"),
    };
    console.log("decryption", JSON.stringify(bufferEncDetails));
    console.log("privKey2", this.postboxKey);
    let decryption;
    try {
      decryption = await ecDecrypt(privKeyBnToEcc(this.postboxKey), bufferEncDetails);
    } catch (err) {
      console.log(err);
      return err;
    }
    return decryption;
  }

  retrievePubKey() {
    return this.ecPostboxKey.getPublic();
  }

  sign(msg) {
    const sig = this.ecPostboxKey.sign(msg);
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(sig.v).toString(16, 2), "hex").toString("base64");
  }
}

module.exports = TorusServiceProvider;
