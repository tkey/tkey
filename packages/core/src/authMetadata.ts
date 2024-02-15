import { IAuthMetadata, KeyType, keyTypeToCurve, StringifiedType, stripHexPrefix } from "@tkey/common-types";
import { keccak256 } from "@toruslabs/torus.js";
import BN from "bn.js";
import { ec as EllipticCurve } from "elliptic";
import stringify from "json-stable-stringify";

import CoreError from "./errors";
import Metadata from "./metadata";

class AuthMetadata implements IAuthMetadata {
  metadata: Metadata;

  privKey: BN;

  keyType: KeyType;

  constructor(keyType: KeyType, metadata: Metadata, privKey?: BN) {
    this.metadata = metadata;
    this.privKey = privKey;
    this.keyType = keyType;
  }

  static fromJSON(value: StringifiedType): AuthMetadata {
    const { data, sig, keyType } = value;

    const m = Metadata.fromJSON(data);
    if (!m.pubKey) throw CoreError.metadataPubKeyUnavailable();

    const postKeyType = keyType in KeyType ? keyType : KeyType.secp256k1;

    const ecCurve: EllipticCurve = keyTypeToCurve(postKeyType);

    const pubK = ecCurve.keyFromPublic({ x: m.pubKey.x.toString("hex", 64), y: m.pubKey.y.toString("hex", 64) }, "hex");
    if (!pubK.verify(stripHexPrefix(keccak256(Buffer.from(stringify(data), "utf8"))), sig)) {
      throw CoreError.default("Signature not valid for returning metadata");
    }
    return new AuthMetadata(postKeyType, m);
  }

  toJSON(): StringifiedType {
    const data = this.metadata;

    if (!this.privKey) throw CoreError.privKeyUnavailable();
    const ecCurve = keyTypeToCurve(this.keyType);
    const k = ecCurve.keyFromPrivate(this.privKey.toBuffer());
    const sig = k.sign(stripHexPrefix(keccak256(Buffer.from(stringify(data), "utf8"))));

    return {
      data,
      sig: sig.toDER("hex"),
      keyType: this.keyType.toString(),
    };
  }
}

export default AuthMetadata;
