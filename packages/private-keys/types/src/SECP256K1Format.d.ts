import { IPrivateKeyFormat, SECP256k1NStore } from "@tkey/common-types";
import BN from "bn.js";
declare class SECP256K1Format implements IPrivateKeyFormat {
    privateKeys: BN[];
    ecParams: any;
    privateKeyType: string;
    constructor(privateKeys: BN[]);
    validatePrivateKeys(privateKey: BN): boolean;
    createPrivateKeyStore(privateKeys: BN[]): SECP256k1NStore;
}
export default SECP256K1Format;
