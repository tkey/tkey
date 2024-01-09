import { getEllipticCurve, IAuthMetadata, KeyType, StringifiedType, stripHexPrefix, toPrivKeyEC } from "@tkey/common-types";
import { keccak256 } from "@toruslabs/torus.js";
import BN from "bn.js";
import stringify from "json-stable-stringify";

import CoreError from "./errors";
import Metadata from "./metadata";

class AuthMetadata implements IAuthMetadata {
  metadata: Metadata;

  privKey: BN;

  keyType: KeyType;

  constructor(metadata: Metadata, privKey?: BN, keyType?: KeyType) {
    this.metadata = metadata;
    this.privKey = privKey;
    this.keyType = keyType || "secp256k1";
  }

  static fromJSON(value: StringifiedType): AuthMetadata {
    const { data, sig, keyType } = value;

    const m = Metadata.fromJSON(data);
    if (!m.pubKey) throw CoreError.metadataPubKeyUnavailable();

    const pubK = getEllipticCurve(keyType).keyFromPublic({ x: m.pubKey.x.toString("hex", 64), y: m.pubKey.y.toString("hex", 64) }, "hex");
    if (!pubK.verify(stripHexPrefix(keccak256(Buffer.from(stringify(data), "utf8"))), sig)) {
      throw CoreError.default("Signature not valid for returning metadata");
    }
    return new AuthMetadata(m);
  }

  toJSON(): StringifiedType {
    const data = this.metadata;

    // do we need here
    if (!this.privKey) throw CoreError.privKeyUnavailable();
    const k = toPrivKeyEC(this.privKey, this.keyType);
    const sig = k.sign(stripHexPrefix(keccak256(Buffer.from(stringify(data), "utf8"))));

    return {
      data,
      sig: sig.toDER("hex"),
    };
  }
}

export default AuthMetadata;
