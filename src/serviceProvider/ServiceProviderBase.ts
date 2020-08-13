import BN from "bn.js";
import { curve, ec as EC } from "elliptic";

import { getPubKeyECC, toPrivKeyEC, toPrivKeyECC } from "../base/BNUtils";
import { BNString, EncryptedMessage, IServiceProvider, PubKeyType, ServiceProviderArgs } from "../base/commonTypes";
import { decrypt as decryptUtils, encrypt as encryptUtils } from "../utils";

class ServiceProviderBase implements IServiceProvider {
  ec: EC;

  enableLogging: boolean;

  // For easy serialization
  postboxKey: BN;

  constructor({ enableLogging = false, postboxKey }: ServiceProviderArgs) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, 16);
  }

  async encrypt(msg: Buffer): Promise<EncryptedMessage> {
    const publicKey = this.retrievePubKey("ecc");
    return encryptUtils(publicKey, msg);
  }

  async decrypt(msg: EncryptedMessage): Promise<Buffer> {
    return decryptUtils(toPrivKeyECC(this.postboxKey), msg);
  }

  retrievePubKeyPoint(): curve.base.BasePoint {
    return toPrivKeyEC(this.postboxKey).getPublic();
  }

  retrievePubKey(type: PubKeyType): Buffer {
    if (type === "ecc") {
      return getPubKeyECC(this.postboxKey);
    }
    throw new Error("Unsupported pub key type");
  }

  sign(msg: BNString): string {
    const sig = toPrivKeyEC(this.postboxKey).sign(msg);
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
  }
}

export default ServiceProviderBase;
