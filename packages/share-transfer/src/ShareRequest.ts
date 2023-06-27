import {
  BNString,
  BufferObj,
  ecCurve,
  EncryptedMessage,
  Point,
  ShareRequestArgs,
  StringifiedType,
  stripHexPrefix,
  toPrivKeyEC,
} from "@tkey/common-types";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

class ShareRequest {
  encPubKey: Buffer;

  encShareInTransit: EncryptedMessage;

  availableShareIndexes: Array<string>;

  userAgent: string;

  customInfo: string;

  userIp: string;

  timestamp: number;

  constructor({ encPubKey, encShareInTransit, availableShareIndexes, userAgent, userIp, timestamp }: ShareRequestArgs) {
    const testEncPubKey = encPubKey as BufferObj;
    if (testEncPubKey.type === "Buffer") {
      this.encPubKey = Buffer.from(testEncPubKey.data);
    } else {
      this.encPubKey = encPubKey as unknown as Buffer;
    }
    this.availableShareIndexes = availableShareIndexes;
    this.encShareInTransit = encShareInTransit;
    this.userAgent = userAgent;
    this.userIp = userIp;
    this.timestamp = timestamp;
  }

  static fromJson(data: StringifiedType) {
    const req = new ShareRequest(data as ShareRequestArgs);
    return req;
  }

  toJsonString() {
    return JSON.stringify(this);
  }
}

export class AuthShareRequest {
  shareRequest: string;

  commitment: string;

  signature: string;

  constructor(shareRequest: ShareRequest) {
    this.shareRequest = shareRequest.toJsonString();
  }

  static fromJSON(value: StringifiedType) {
    const { shareRequest, commitment, signature } = value;
    const authShareRequest = new AuthShareRequest(ShareRequest.fromJson(JSON.parse(shareRequest)));
    authShareRequest.commitment = commitment;
    authShareRequest.signature = signature;
    return authShareRequest;
  }

  async sign(share: BNString) {
    const msg = stripHexPrefix(keccak256(Buffer.from(this.shareRequest).toString("hex")));
    const bnShare = new BN(share, "hex");
    const key = toPrivKeyEC(bnShare);

    const signature = key.sign(Buffer.from(msg, "hex"));
    this.signature = signature.toDER("hex");

    this.commitment = key.getPublic().encode("hex", true);
    return this;
  }

  async verify() {
    const point = Point.fromCompressedPub(this.commitment);
    const msg = stripHexPrefix(keccak256(Buffer.from(this.shareRequest).toString("hex")));

    const pubK = ecCurve.keyFromPublic({ x: point.x.toString("hex", 64), y: point.y.toString("hex", 64) }, "hex");
    if (!pubK.verify(msg, this.signature)) {
      throw new Error("Signature not valid for returning metadata");
    }
  }

  async getVerifiedShareRequest() {
    await this.verify();
    return ShareRequest.fromJson(JSON.parse(this.shareRequest)) as ShareRequest;
  }
}

export default ShareRequest;
