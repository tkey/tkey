import { ecCurve, generateID, IPrivateKeyFormat, IPrivateKeyStore } from "@oraichain/common-types";
import BN from "bn.js";
import randombytes from "randombytes";

export class SECP256K1Format implements IPrivateKeyFormat {
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

  createPrivateKeyStore(privateKey?: BN): IPrivateKeyStore {
    let privKey: BN;
    if (!privateKey) {
      privKey = new BN(randombytes(64));
    } else {
      if (!this.validatePrivateKey(privateKey)) {
        throw Error("Invalid Private Key");
      }
      privKey = privateKey;
    }
    return {
      id: generateID(),
      privateKey: privKey,
      type: this.type,
    };
  }
}
