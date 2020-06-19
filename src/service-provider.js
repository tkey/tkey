import Torus from "@toruslabs/torus.js";
import BN from "bn.js";
import { decrypt, encrypt } from "eccrypto";
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
import { ec as EC } from "elliptic";

const ecEncrypt = encrypt;

class TorusServiceProvider {
  constructor({ enableLogging = false, postboxKey = "bef742202d22d45533cc512a550bcfc994259bc78ce98117a92387e72ee8240c" } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.postboxKey = new BN(postboxKey, "hex");
  }

  encrypt(publicKey, msg) {
    return ecEncrypt(publicKey, msg);
  }

  decrypt(msg) {}

  retrievePubKey() {}
}

export default TorusServiceProvider;
