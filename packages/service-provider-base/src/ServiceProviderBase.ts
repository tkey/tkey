import {
  BNString,
  decrypt as decryptUtils,
  encrypt as encryptUtils,
  EncryptedMessage,
  getEncryptionPrivateKey,
  getEncryptionPublicKey,
  getPrivateKeyForSigning,
  getPubKeyECC,
  IServiceProvider,
  KeyType,
  PubKeyType,
  ServiceProviderArgs,
  StringifiedType,
  toPrivKeyEC,
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
    this.keyType = keyType in KeyType ? keyType : KeyType.secp256k1;
  }

  static fromJSON(value: StringifiedType): IServiceProvider {
    const { enableLogging, postboxKey, serviceProviderName, keyType } = value;
    if (serviceProviderName !== "ServiceProviderBase") return undefined;

    return new ServiceProviderBase({ enableLogging, postboxKey, keyType });
  }

  async encrypt(msg: Buffer): Promise<EncryptedMessage> {
    const encryptionPubKey = getEncryptionPublicKey(this.postboxKey, this.keyType);
    return encryptUtils(encryptionPubKey, msg);
  }

  async decrypt(msg: EncryptedMessage): Promise<Buffer> {
    return decryptUtils(getEncryptionPrivateKey(this.postboxKey, this.keyType), msg);
  }

  retrievePubKeyPoint(): curve.base.BasePoint {
    return toPrivKeyEC(this.postboxKey, this.keyType).getPublic();
  }

  retrievePubKey(type: PubKeyType): Buffer {
    if (type === "ecc") {
      return getPubKeyECC(this.postboxKey, this.keyType, false);
    }
    throw new Error("Unsupported pub key type");
  }

  sign(msg: BNString): string {
    const tmp = new BN(msg, "hex");
    const sig = toPrivKeyEC(this.postboxKey, this.keyType).sign(tmp.toString("hex"));
    return Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
  }

  metadataSign(msg: BNString): {
    sig: string;
    pubX: string;
    pubY: string;
  } {
    const tmp = new BN(msg, "hex");
    const keyPair = getPrivateKeyForSigning(this.postboxKey, this.keyType);
    const sig = keyPair.sign(tmp.toString("hex"));
    const pubKey = keyPair.getPublic();
    return {
      sig: Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64"),
      pubX: pubKey.getX().toString("hex"),
      pubY: pubKey.getY().toString("hex"),
    };
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
