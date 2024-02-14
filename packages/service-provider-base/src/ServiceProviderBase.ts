import {
  BNString,
  decrypt as decryptUtils,
  ed25519ToSecp256k1,
  encrypt as encryptUtils,
  EncryptedMessage,
  getPubKeyECC,
  IServiceProvider,
  KeyType,
  keyTypeToCurve,
  PubKeyType,
  ServiceProviderArgs,
  StringifiedType,
  toPrivKeyEC,
  toPrivKeyECC,
} from "@tkey/common-types";
import BN from "bn.js";
import { curve } from "elliptic";

class ServiceProviderBase implements IServiceProvider {
  enableLogging: boolean;

  // For easy serialization
  postboxKey: BN;

  keyType: KeyType;

  serviceProviderName: string;

  constructor({ enableLogging = false, postboxKey, keyType }: ServiceProviderArgs) {
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, "hex");
    this.serviceProviderName = "ServiceProviderBase";
    if (keyType in KeyType) {
      this.keyType = keyType;
    } else {
      throw new Error("keyType is required");
    }
  }

  static fromJSON(value: StringifiedType): IServiceProvider {
    const { enableLogging, postboxKey, serviceProviderName, keyType } = value;
    if (serviceProviderName !== "ServiceProviderBase") return undefined;

    return new ServiceProviderBase({ enableLogging, postboxKey, keyType });
  }

  async encrypt(msg: Buffer): Promise<EncryptedMessage> {
    if (this.keyType === KeyType.ed25519) {
      const scCurve = keyTypeToCurve(KeyType.secp256k1);
      const scKey = ed25519ToSecp256k1(this.postboxKey);
      const pk = scCurve.keyFromPrivate(scKey.toBuffer()).getPublic().encode("hex", true);
      return encryptUtils(Buffer.from(pk, "hex"), msg);
    }
    const publicKey = this.retrievePubKey("ecc");
    return encryptUtils(publicKey, msg);
  }

  async decrypt(msg: EncryptedMessage): Promise<Buffer> {
    if (this.keyType === KeyType.ed25519) {
      const scKey = ed25519ToSecp256k1(this.postboxKey);
      return decryptUtils(scKey.toBuffer(), msg);
    }
    return decryptUtils(toPrivKeyECC(this.postboxKey), msg);
  }

  retrievePubKeyPoint(): curve.base.BasePoint {
    const ecCurve = keyTypeToCurve(this.keyType);
    return toPrivKeyEC(this.postboxKey, ecCurve).getPublic();
  }

  retrievePubKey(type: PubKeyType): Buffer {
    if (type === "ecc") {
      return getPubKeyECC(this.postboxKey);
    }
    throw new Error("Unsupported pub key type");
  }

  sign(msg: BNString): string {
    const tmp = new BN(msg, "hex");
    const ecCurve = keyTypeToCurve(this.keyType);
    const sig = toPrivKeyEC(this.postboxKey, ecCurve).sign(tmp.toString("hex"));
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
  }

  toJSON(): StringifiedType {
    return {
      enableLogging: this.enableLogging,
      postboxKey: this.postboxKey.toString("hex"),
      serviceProviderName: this.serviceProviderName,
      keyType: this.keyType,
    };
  }
}

export default ServiceProviderBase;
