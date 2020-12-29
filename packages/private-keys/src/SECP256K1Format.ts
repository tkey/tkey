import { ecCurve, generateID, IPrivateKeyFormat, SECP256k1NStore } from "@tkey/common-types";
import BN from "bn.js";

class SECP256K1Format implements IPrivateKeyFormat {
  privateKey: BN;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ecParams: any;

  type: string;

  constructor(privateKey: BN) {
    this.privateKey = privateKey;
    this.ecParams = ecCurve.curve;
    this.type = "secp256k1n";
  }

  validatePrivateKey(privateKey: BN): boolean {
    return privateKey.cmp(this.ecParams.n) < 0 && !privateKey.isZero();
  }

  createPrivateKeyStore(privateKey: BN): SECP256k1NStore {
    if (!this.validatePrivateKey(privateKey)) {
      throw new Error("validation failed");
    }

    return {
      id: generateID(),
      privateKey,
      type: this.type,
    };
  }
}
export default SECP256K1Format;
