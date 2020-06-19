import Torus from "@toruslabs/torus.js";
import atob from "atob";
import BN from "bn.js";
import btoa from "btoa";
// import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
import { decrypt, encrypt, generatePrivate, getPublic } from "eccrypto";
import { ec as EC } from "elliptic";

import { post } from "./httpHelpers";
import { privKeyBnToEcc } from "./utils";

class ThresholdBak {
  constructor({ enableLogging = false, peggedKey = "bef742202d22d45533cc512a550bcfc994259bc78ce98117a92387e72ee8240c" } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.peggedKey = new BN(peggedKey, "hex");
  }

  async initializeLogin() {
    const keyDetails = this.torus.generateMetadataParams({}, this.peggedKey);
    let metadataResponse;
    try {
      metadataResponse = await post("https://metadata.tor.us/get", keyDetails);
    } catch (error) {
      return error;
    }
    console.log("we get back", metadataResponse);

    const input = JSON.parse(atob(metadataResponse.message));
    console.log("decrypt input", input);
    const bufferEncDetails = {
      ciphertext: Buffer.from(input.ciphertext, "hex"),
      ephemPublicKey: Buffer.from(input.ephemPublicKey, "hex"),
      iv: Buffer.from(input.iv, "hex"),
      mac: Buffer.from(input.mac, "hex"),
    };
    console.log("mac2", bufferEncDetails.mac);
    console.log("hexmac2", input.mac);
    try {
      decrypt(privKeyBnToEcc(this.privKey), bufferEncDetails);
    } catch (err) {
      console.log(err);
      return err;
    }
    return metadataResponse;
    // this.torus.getMetadata
  }

  async initializeNewKey() {
    const tmpPriv = generatePrivate();
    this.setKey(new BN(tmpPriv));

    const shares = this.torus.generateRandomShares(2, 2, this.privKey);
    [, this.localShare] = shares;
    // store torus share on metadata
    const shareDetails = Buffer.from(JSON.stringify({ [this.ecKey.getPublic()]: shares[0] }));
    const encryptedDetails = await encrypt(getPublic(privKeyBnToEcc(this.privKey)), shareDetails);
    const nonBufferEncDetails = {
      ciphertext: encryptedDetails.ciphertext.toString("hex"),
      ephemPublicKey: encryptedDetails.ephemPublicKey.toString("hex"),
      iv: encryptedDetails.iv.toString("hex"),
      mac: encryptedDetails.mac.toString("hex"),
    };
    console.log("mac1", encryptedDetails.mac);
    console.log("hexmac1", nonBufferEncDetails.mac);
    const serializedEncryptedDetails = btoa(JSON.stringify(nonBufferEncDetails));
    const p = this.torus.generateMetadataParams(serializedEncryptedDetails, this.peggedKey);
    console.log("waht we're setting", serializedEncryptedDetails);
    let response;
    try {
      response = await post("https://metadata.tor.us/set", p);
    } catch (err) {
      console.log("error", err);
    }
    console.log("set metadata response", response);
    // store tdkm metadata about key
    const keyDetails = this.torus.generateMetadataParams(
      btoa(
        JSON.stringify({
          shareNonce: 2,
        })
      ),
      this.privKey
    );
    response = await this.torus.setMetadata(keyDetails);
    console.log("set metadata response 2", response);
    return { privKey: this.privKey, localShare: this.localShare };
  }

  setKey(privKey) {
    this.privKey = privKey;
    this.ecKey = this.ec.keyFromPrivate(this.privKey);
    console.log("privkey", this.privKey);
  }
}

export default ThresholdBak;
