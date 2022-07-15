import { generateID, IPrivateKeyFormat, IPrivateKeyStore } from "@tkey/common-types";
import BN from "bn.js";
import nacl from "tweetnacl";

export class ED25519Format implements IPrivateKeyFormat {
  privateKey: BN;

  type: string;

  constructor(privateKey: BN) {
    this.privateKey = privateKey;
    this.type = "ed25519";
  }

  validatePrivateKey(privateKey: BN): boolean {
    try {
      nacl.box.keyPair.fromSecretKey(privateKey.toBuffer());
      return true;
    } catch (err) {
      return false;
    }
  }

  createPrivateKeyStore(privateKey?: BN): IPrivateKeyStore {
    let privKey: BN;
    if (!privateKey) {
      privKey = new BN(nacl.box.keyPair().secretKey);
    } else {
      privKey = privateKey;
    }
    return {
      id: generateID(),
      privateKey: privKey,
      type: this.type,
    };
  }
}
