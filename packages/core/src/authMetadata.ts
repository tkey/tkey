import { ecCurve, StringifiedType, toPrivKeyEC } from "@tkey/common-types";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

import Metadata from "./metadata";

class AuthMetadata {
  metadata: Metadata;

  privKey: BN;

  constructor(metadata: Metadata, privKey?: BN) {
    this.metadata = metadata;
    this.privKey = privKey;
  }

  toJSON(): StringifiedType {
    const data = this.metadata.toJSON();

    const k = toPrivKeyEC(this.privKey);
    const sig = k.sign(keccak256(JSON.stringify(data)));

    return {
      data,
      sig: sig.toDER("hex"),
    };
  }

  static fromJSON(value: StringifiedType): AuthMetadata {
    const { data, sig } = value;
    const m = Metadata.fromJSON(data);
    const pubK = ecCurve.keyFromPublic({ x: m.pubKey.x.toString("hex", 64), y: m.pubKey.y.toString("hex", 64) }, "hex");
    if (!pubK.verify(JSON.stringify(data), sig)) {
      throw Error("Signature not valid for returning metdata");
    }
    return new AuthMetadata(m);
  }
}

export default AuthMetadata;
