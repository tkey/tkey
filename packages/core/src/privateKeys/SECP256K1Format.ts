import { ecCurve, IPrivateKeyFormat, SECP256k1NStore } from "@tkey/types";
import BN from "bn.js";

class SECP256K1Format implements IPrivateKeyFormat {
  privateKeys: BN[];

  ecParams: any;

  privateKeyType: string;

  constructor(privateKeys: BN[]) {
    this.privateKeys = privateKeys;
    this.ecParams = ecCurve.curve;
    this.privateKeyType = "secp256k1n";
  }

  validatePrivateKeys(privateKey: BN): boolean {
    return privateKey.cmp(this.ecParams.n) < 0 && !privateKey.isZero();
  }

  createPrivateKeyStore(privateKeys: BN[]): SECP256k1NStore {
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
