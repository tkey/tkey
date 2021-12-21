import { ecCurve, IAuthMetadata, StringifiedType, stripHexPrefix, toPrivKeyEC } from "@tkey/common-types";
import BN from "bn.js";
import stringify from "json-stable-stringify";
import { keccak256 } from "web3-utils";

import CoreError from "./errors";
import Metadata from "./metadata";

class AuthMetadata implements IAuthMetadata {
  metadata: Metadata;

  privKey: BN;

  constructor(metadata: Metadata, privKey?: BN) {
    this.metadata = metadata;
    this.privKey = privKey;
  }

  static fromJSON(value: StringifiedType): AuthMetadata {
    const { data, sig } = value;

    const m = Metadata.fromJSON(data);
    if (!m.pubKey) throw CoreError.metadataPubKeyUnavailable();

    const pubK = ecCurve.keyFromPublic({ x: m.pubKey.x.toString("hex", 64), y: m.pubKey.y.toString("hex", 64) }, "hex");
    if (!pubK.verify(stripHexPrefix(keccak256(stringify(data))), sig)) {
      throw CoreError.default("Signature not valid for returning metadata");
    }
    return new AuthMetadata(m);
  }

  toJSON(): StringifiedType {
    const data = this.metadata;

    if (!this.privKey) throw CoreError.privKeyUnavailable();
    const k = toPrivKeyEC(this.privKey);
    const sig = k.sign(stripHexPrefix(keccak256(stringify(data))));

    return {
      data,
      sig: sig.toDER("hex"),
    };
  }
}

export default AuthMetadata;
