import Torus from "@toruslabs/torus.js";
import BN from "bn.js";
import { decrypt, encrypt } from "eccrypto";
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
import { ec as EC } from "elliptic";

const ecEncrypt = encrypt;
const ecDecrypt = decrypt;

class TorusServiceProvider {
  constructor({ enableLogging = false, postboxKey = "bef742202d22d45533cc512a550bcfc994259bc78ce98117a92387e72ee8240c" } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.postboxKey = new BN(postboxKey, "hex");
    this.ecPostboxKey = this.ec.keyFromPrivate(this.postboxKey.toString("hex", 64));
  }

  // TODO: convert not to use ecc publicKey
  encrypt = async function (publicKey, msg) {
    let encryptedDetails;
    try {
      encryptedDetails = await ecEncrypt(publicKey, msg);
    } catch (err) {
      return err;
    }
    return {
      ciphertext: encryptedDetails.ciphertext.toString("hex"),
      ephemPublicKey: encryptedDetails.ephemPublicKey.toString("hex"),
      iv: encryptedDetails.iv.toString("hex"),
      mac: encryptedDetails.mac.toString("hex"),
    };
  };

  // TODO: convert not to use ecc private key
  decrypt = async function (privKey, msg) {
    const bufferEncDetails = {
      ciphertext: Buffer.from(msg.ciphertext, "hex"),
      ephemPublicKey: Buffer.from(msg.ephemPublicKey, "hex"),
      iv: Buffer.from(msg.iv, "hex"),
      mac: Buffer.from(msg.mac, "hex"),
    };
    let decryption;
    try {
      decryption = ecDecrypt(privKey, bufferEncDetails);
    } catch (err) {
      console.log(err);
      return err;
    }
    return decryption;
  };

  retrievePubKey() {
    return this.ecPostboxKey.getPublic();
  }

  sign(msg) {
    const sig = this.ecPostboxKey.sign(msg);
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(sig.v).toString(16, 2), "hex").toString("base64");
  }
}

export default TorusServiceProvider;
