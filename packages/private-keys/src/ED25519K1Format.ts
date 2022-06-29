import { ecCurve, ED25519k1NStore, generateID, IPrivateKeyFormat } from "@tkey/common-types";
import { getED25519Key } from "@toruslabs/openlogin-ed25519";
import BN from "bn.js";
import randombytes from "randombytes";

class ED25519K1Format implements IPrivateKeyFormat {
  privateKey: BN;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ecParams: any;

  type: string;

  constructor(privateKey: BN) {
    this.privateKey = privateKey;
    this.ecParams = ecCurve.curve;
    this.type = "ed25519k1n";
  }

  validatePrivateKey(privateKey: BN): boolean {
    return privateKey.cmp(this.ecParams.n) < 0 && !privateKey.isZero();
  }

  createPrivateKeyStore(privateKey?: BN): ED25519k1NStore {
    const finalPrivateKey = privateKey || new BN(randombytes(64));
    const ed25519k = getED25519Key(finalPrivateKey.toBuffer());
    return {
      id: generateID(),
      privateKey: new BN(ed25519k.sk),
      type: this.type,
    };
  }
}
export default ED25519K1Format;
