import { IPrivateKeyFormat, SECP256k1NStore } from "../baseTypes/aggregateTypes";
declare class SECP256K1Format implements IPrivateKeyFormat {
    privateKeys: string[];
    ecParams: any;
    privateKeyType: string;
    constructor(privateKeys: string[]);
    validatePrivateKeys(privateKey: string): boolean;
    createPrivateKeyStore(privateKeys: string[]): SECP256k1NStore;
}
export default SECP256K1Format;
