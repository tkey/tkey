import { ecCurve, generateID, IPrivateKeyFormat, SECP256k1NStore } from "@tkey/common-types";
import BN from "bn.js";
import randombytes from "randombytes";

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

  createPrivateKeyStore(privateKey?: BN): SECP256k1NStore {
    const finalPrivateKey = privateKey || new BN(randombytes(64));
    return {
      id: generateID(),
      privateKey: finalPrivateKey,
      type: this.type,
    };
  }
}
export default SECP256K1Format;
