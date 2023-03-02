import {
  BNString,
  decrypt as decryptUtils,
  encrypt as encryptUtils,
  EncryptedMessage,
  getPubKeyECC,
  IServiceProvider,
  Point,
  PointHex,
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

  useTSS: boolean;

  tssPubKeys: Record<string, Point>;

  // For easy serialization
  postboxKey: BN;

  serviceProviderName: string;

  verifierName?: string;

  verifierId?: string;

  tssNodeDetails: {
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  };

  rssNodeDetails: {
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  };

  sssNodeDetails: {
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  };

  constructor({ enableLogging = false, postboxKey, useTSS = false }: ServiceProviderArgs) {
    this.useTSS = useTSS;
    this.enableLogging = enableLogging;
    this.postboxKey = new BN(postboxKey, "hex");
    this.serviceProviderName = "ServiceProviderBase";
    this.tssPubKeys = {};
    this.tssNodeDetails = {
      serverEndpoints: [],
      serverPubKeys: [],
      serverThreshold: -1,
    };
    this.rssNodeDetails = {
      serverEndpoints: [],
      serverPubKeys: [],
      serverThreshold: -1,
    };
    this.sssNodeDetails = {
      serverEndpoints: [],
      serverPubKeys: [],
      serverThreshold: -1,
    };
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

  _setVerifierNameVerifierId(verifierName: string, verifierId: string) {
    this.verifierName = verifierName;
    this.verifierId = verifierId;
  }

  getVerifierNameVerifierId(): string {
    return `${this.verifierName}\u001c${this.verifierId}`;
  }

  _setTSSNodeDetails(serverEndpoints: string[], serverPubKeys: PointHex[], serverThreshold: number): void {
    this.tssNodeDetails = {
      serverEndpoints,
      serverPubKeys,
      serverThreshold,
    };
  }

  async getTSSNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }> {
    return this.tssNodeDetails;
  }

  async getRSSNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }> {
    return this.rssNodeDetails;
  }

  async getSSSNodeDetails(): Promise<{
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  }> {
    return this.sssNodeDetails;
  }

  _setTSSPubKey(tssTag: string, tssNonce: number, tssPubKey: Point) {
    this.tssPubKeys[`${this.verifierName}\u001c${this.verifierId}\u0015${tssTag}\u0016${tssNonce}`] = tssPubKey;
  }

  async getTSSPubKey(tssTag: string, tssNonce: number): Promise<Point> {
    const tssPubKey = this.tssPubKeys[`${this.verifierName}\u001c${this.verifierId}\u0015${tssTag}\u0016${tssNonce}`];

    if (!tssPubKey) {
      throw new Error(`tss pub key could not be found for ${this.verifierName}\u001c${this.verifierId}\u0015${tssTag}\u0016${tssNonce}`);
    }
    return tssPubKey;
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
