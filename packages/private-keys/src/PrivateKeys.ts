import { IModule, IPrivateKeyFormat, IPrivateKeyStore, ITKeyApi } from "@tkey/common-types";
import BN from "bn.js";

import PrivateKeysError from "./errors";

export const PRIVATE_KEY_MODULE_NAME = "privateKeyModule";

class PrivateKeyModule implements IModule {
  moduleName: string;

  privateKeyFormats: IPrivateKeyFormat[];

  constructor(formats: IPrivateKeyFormat[]) {
    this.moduleName = PRIVATE_KEY_MODULE_NAME;
    this.privateKeyFormats = formats;
  }

  setModuleReferences(tkey: ITKeyApi): void {
    tkey._addReconstructKeyMiddleware(this.moduleName, this.getAccounts.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setPrivateKey(tkey: ITKeyApi, privateKeyType: string, privateKey?: BN): Promise<void> {
    const format = this.privateKeyFormats.find((el) => el.type === privateKeyType);
    if (!format) {
      throw PrivateKeysError.notSupported();
    }
    if (privateKey && !format.validatePrivateKey(privateKey)) {
      throw PrivateKeysError.invalidPrivateKey(`${privateKey}`);
    }
    const privateKeyStore = format.createPrivateKeyStore(privateKey);
    return tkey._setTKeyStoreItem(this.moduleName, privateKeyStore);
  }

  async getPrivateKeys(tkey: ITKeyApi): Promise<IPrivateKeyStore[]> {
    return tkey.getTKeyStore(this.moduleName) as Promise<IPrivateKeyStore[]>;
  }

  async getAccounts(tkey: ITKeyApi): Promise<BN[]> {
    try {
      // Get all private keys
      const privateKeys = (await tkey.getTKeyStore(this.moduleName)) as IPrivateKeyStore[];
      return privateKeys.reduce((acc: BN[], x) => {
        acc.push(BN.isBN(x.privateKey) ? x.privateKey : new BN(x.privateKey, "hex"));
        return acc;
      }, []);
    } catch (err) {
      return [];
    }
  }
}

export default PrivateKeyModule;
