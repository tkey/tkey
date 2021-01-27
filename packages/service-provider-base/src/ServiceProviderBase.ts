import {
  BNString,
  decrypt as decryptUtils,
  encrypt as encryptUtils,
  EncryptedMessage,
  getPubKeyECC,
  IServiceProvider,
  PubKeyType,
  ServiceProviderArgs,
  StringifiedType,
  toPrivKeyEC,
  toPrivKeyECC,
} from "@tkey/common-types";
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";

class ServiceProviderBase implements IServiceProvider {
  ec: EC;

  enableLogging: boolean;

  // For easy serialization
  postboxKey: BN;

  constructor({ enableLogging = false, postboxKey }: ServiceProviderArgs) {
    this.ec = new EC("secp256k1");
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, "hex");
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
    const tmp = new BN(msg, "hex");
    const sig = toPrivKeyEC(this.postboxKey).sign(tmp.toString("hex"));
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
  }

  toJSON(): StringifiedType {
    return {
      enableLogging: this.enableLogging,
      postboxKey: this.postboxKey.toString("hex"),
    };
  }

  static fromJSON(value: StringifiedType): ServiceProviderBase {
    const { enableLogging, postboxKey } = value;
    return new ServiceProviderBase({ enableLogging, postboxKey });
  }
}

export default ServiceProviderBase;
