const Torus = require("@toruslabs/torus.js");
const BN = require("bn.js");
// const { decrypt, encrypt, generatePrivate, getPublic } = require("eccrypto");
const { generatePrivate } = require("eccrypto");
const { ec } = require("elliptic");
const EC = ec;

const TorusServiceProvider = require("./service-provider");
const TorusStorageLayer = require("./storage-layer");
const { privKeyBnToPubKeyECC } = require("./utils");

class ThresholdBak {
  constructor({ enableLogging = false, peggedKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d" } = {}) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.torus = new Torus();
    this.peggedKey = new BN(peggedKey, "hex");
    this.serviceProvider = new TorusServiceProvider({ postboxKey: peggedKey });
    this.storageLayer = new TorusStorageLayer({ enableLogging: true, serviceProvider: this.serviceProvider });
  }

  async retrieveMetadata() {
    let keyDetails;
    try {
      keyDetails = await this.storageLayer.getMetadata();
    } catch (err) {
      console.log(err);
    }
    let response;
    try {
      debugger;
      response = await this.serviceProvider.decrypt(keyDetails);
    } catch (err) {
      console.log(err);
    }
    return response;
  }

  async initializeNewKey() {
    const tmpPriv = generatePrivate();
    this.setKey(new BN(tmpPriv));

    const shares = this.torus.generateRandomShares(2, 2, this.privKey);
    [, this.localShare] = shares;
    // store torus share on metadata
    const shareDetails = Buffer.from(JSON.stringify({ [this.ecKey.getPublic()]: shares[0] }));
    const encryptedDetails = await this.serviceProvider.encrypt(privKeyBnToPubKeyECC(this.peggedKey), shareDetails);
    console.log("privkey1", this.peggedKey);
    let response;
    console.log(response);
    try {
      await this.storageLayer.setMetadata(encryptedDetails);
    } catch (err) {
      console.log(err);
      return err;
    }
    // store tdkm metadata about key
    // const keyDetails = this.torus.generateMetadataParams(
    //   btoa(
    //     JSON.stringify({
    //       shareNonce: 2,
    //     })
    //   ),
    //   this.privKey
    // );
    // response = await this.torus.setMetadata(keyDetails);
    // console.log("set metadata response 2", response);
    return { privKey: this.privKey, localShare: this.localShare };
  }

  setKey(privKey) {
    this.privKey = privKey;
    this.ecKey = this.ec.keyFromPrivate(this.privKey);
    console.log("privkey", this.privKey);
  }
}

module.exports = ThresholdBak;
