import { IPrivateKeyFormat, SECP256k1NStore } from "@tkey/common-types";
import BN from "bn.js";
declare class SECP256K1Format implements IPrivateKeyFormat {
    privateKey: BN;
    ecParams: any;
    type: string;
    constructor(privateKey: BN);
    validatePrivateKey(privateKey: BN): boolean;
    createPrivateKeyStore(privateKey?: BN): SECP256k1NStore;
}
export default SECP256K1Format;
