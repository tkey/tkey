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
} from "@oraichain/common-types";
import BN from "bn.js";
import { curve } from "elliptic";

class ServiceProviderBase implements IServiceProvider {
  enableLogging: boolean;

  // For easy serialization
  postboxKey: BN;

  serviceProviderName: string;

  constructor({ enableLogging = false, postboxKey }: ServiceProviderArgs) {
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, "hex");
    this.serviceProviderName = "ServiceProviderBase";
  }

  static fromJSON(value: StringifiedType): IServiceProvider {
    const { enableLogging, postboxKey, serviceProviderName } = value;
    if (serviceProviderName !== "ServiceProviderBase") return undefined;

    return new ServiceProviderBase({ enableLogging, postboxKey });
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
      serviceProviderName: this.serviceProviderName,
    };
  }
}

export default ServiceProviderBase;
