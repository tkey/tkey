import BN from "bn.js";

import { BNString, IPoint, StringifiedType } from "../baseTypes/commonTypes";
import { Curve, getEllipticCurve } from "../utils";
import { getPubKeyEC } from ".";

class Point implements IPoint {
  x: BN;

  y: BN;

  keyType?: Curve;

  constructor(x: BNString, y: BNString, keyType?: Curve) {
    this.x = new BN(x, "hex");
    this.y = new BN(y, "hex");
    this.keyType = keyType || "secp256k1";
  }

  static fromCompressedPub(value: string, keyType?: Curve): Point {
    const key = getEllipticCurve(keyType || "secp256k1").keyFromPublic(value, "hex");
    const pt = key.getPublic();
    return new Point(pt.getX(), pt.getY());
  }

  static fromPrivateKey = (bn: BN, keyType?: Curve): Point => {
    const pubKeyEc = getPubKeyEC(bn, keyType || "secp256k1");
    return new this(pubKeyEc.getX().toString("hex"), pubKeyEc.getY().toString("hex"));
  };

  static fromJSON(value: StringifiedType): Point {
    const { x, y } = value;
    return new Point(x, y);
  }

  // complies with EC and elliptic pub key types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encode(enc: string, params?: any): Buffer {
    switch (enc) {
      case "arr":
        return Buffer.concat([Buffer.from("0x04", "hex"), Buffer.from(this.x.toString("hex"), "hex"), Buffer.from(this.y.toString("hex"), "hex")]);
      case "elliptic-compressed": {
        // TODO: WHAT IS THIS.?
        const ec = params?.ec || getEllipticCurve(this.keyType);
        const key = ec.keyFromPublic({ x: this.x.toString("hex"), y: this.y.toString("hex") }, "hex");
        return Buffer.from(key.getPublic(true, "hex"));
      }
      default:
        throw new Error("encoding doesnt exist in Point");
    }
  }

  toJSON(): StringifiedType {
    return {
      x: this.x.toString("hex"),
      y: this.y.toString("hex"),
    };
  }
}

export default Point;
