import BN from "bn.js";
import { curve, ec as EC } from "elliptic";

import { getPubKeyECC, toPrivKeyEC, toPrivKeyECC } from "../base/BNUtils";
import { BNString, EncryptedMessage, IServiceProvider, ServiceProviderArgs } from "../base/commonTypes";
import { decrypt as decryptUtils, encrypt as encryptUtils } from "../utils";

class ServiceProviderBase implements IServiceProvider {
  ec: EC;

  enableLogging: boolean;

  postboxKey: BN;

  constructor({ enableLogging = false, postboxKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d" }: ServiceProviderArgs) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, 16);
  }

  async encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage> {
    return encryptUtils(publicKey, msg);
  }

  async decrypt(msg: EncryptedMessage): Promise<Buffer> {
    return decryptUtils(toPrivKeyECC(this.postboxKey), msg);
  }

  retrievePubKey(type: "ecc"): Buffer | curve.base.BasePoint {
    if (type === "ecc") {
      return getPubKeyECC(this.postboxKey);
    }
    return toPrivKeyEC(this.postboxKey).getPublic();
  }

  sign(msg: BNString): string {
    const sig = toPrivKeyEC(this.postboxKey).sign(msg);
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
  }
}

export default ServiceProviderBase;
