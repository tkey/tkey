import { IAuthMetadata, KeyType, StringifiedType, stripHexPrefix, toPrivKeyEC } from "@tkey/common-types";
import { keccak256 } from "@toruslabs/torus.js";
import BN from "bn.js";
import { ec as EllipticCurve } from "elliptic";
import stringify from "json-stable-stringify";

import CoreError from "./errors";
import Metadata from "./metadata";

class AuthMetadata implements IAuthMetadata {
  metadata: Metadata;

  privKey: BN;

  ecCurve: EllipticCurve;

  keyType: KeyType;

  constructor(metadata: Metadata, privKey?: BN, keyType?: KeyType) {
    this.metadata = metadata;
    this.privKey = privKey;
    this.keyType = keyType;
    if (keyType) {
      this.ecCurve = new EllipticCurve(keyType.toString());
    } else {
      this.ecCurve = new EllipticCurve(KeyType.secp256k1.toString());
    }
  }

  static fromJSON(value: StringifiedType): AuthMetadata {
    const { data, sig, keyType } = value;

    const m = Metadata.fromJSON(data);
    if (!m.pubKey) throw CoreError.metadataPubKeyUnavailable();

    let ecCurve: EllipticCurve;
    if (keyType) {
      ecCurve = new EllipticCurve(keyType.toString());
    } else {
      ecCurve = new EllipticCurve(KeyType.secp256k1.toString());
    }

    const pubK = ecCurve.keyFromPublic({ x: m.pubKey.x.toString("hex", 64), y: m.pubKey.y.toString("hex", 64) }, "hex");
    if (!pubK.verify(stripHexPrefix(keccak256(Buffer.from(stringify(data), "utf8"))), sig)) {
      throw CoreError.default("Signature not valid for returning metadata");
    }
    return new AuthMetadata(m);
  }

  toJSON(): StringifiedType {
    const data = this.metadata;

    if (!this.privKey) throw CoreError.privKeyUnavailable();
    const k = toPrivKeyEC(this.privKey, this.ecCurve);
    const sig = k.sign(stripHexPrefix(keccak256(Buffer.from(stringify(data), "utf8"))));

    return {
      data,
      sig: sig.toDER("hex"),
      keyType: this.keyType.toString(),
    };
  }
}

export default AuthMetadata;
