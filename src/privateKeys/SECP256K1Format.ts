import BN from "bn.js";

import { IPrivateKeyFormat, SECP256k1NStore } from "../baseTypes/aggregateTypes";
import { ecCurve } from "../utils";

class SECP256K1Format implements IPrivateKeyFormat {
  privateKeys: string[];

  ecParams: any;

  privateKeyType: string;

  constructor(privateKeys: string[]) {
    this.privateKeys = privateKeys;
    this.ecParams = ecCurve.curve;
    this.privateKeyType = "secp256k1n";
  }

  validatePrivateKeys(privateKey: string): boolean {
    const bn = new BN(privateKey, "hex");
    return bn.cmp(this.ecParams.n) < 0 && !bn.isZero();
  }

  createPrivateKeyStore(privateKeys: string[]): SECP256k1NStore {
    privateKeys.forEach((el) => {
      if (!this.validatePrivateKeys(el)) {
        throw new Error("validation failed");
      }
    });
    return {
      privateKeys,
      privateKeyType: this.privateKeyType,
    };
  }
}
export default SECP256K1Format;
