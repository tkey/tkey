import { IModule, IPrivateKeyFormat, IPrivateKeyStore, ITKeyApi } from "@oraichain/common-types";
import BN from "bn.js";

import PrivateKeysError from "./errors";

export const PRIVATE_KEY_MODULE_NAME = "privateKeyModule";

class PrivateKeyModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  privateKeyFormats: IPrivateKeyFormat[];

  constructor(formats: IPrivateKeyFormat[]) {
    this.moduleName = PRIVATE_KEY_MODULE_NAME;
    this.privateKeyFormats = formats;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK._addReconstructKeyMiddleware(this.moduleName, this.getAccounts.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> { }

  async setPrivateKey(privateKeyType: string, privateKey?: BN): Promise<void> {
    const format = this.privateKeyFormats.find((el) => el.type === privateKeyType);
    if (!format) {
      throw PrivateKeysError.notSupported();
    }
    if (privateKey && !format.validatePrivateKey(privateKey)) {
      throw PrivateKeysError.invalidPrivateKey(`${privateKey}`);
    }
    const privateKeyStore = format.createPrivateKeyStore(privateKey);
    return this.tbSDK._setTKeyStoreItem(this.moduleName, privateKeyStore);
  }

  async getPrivateKeys(): Promise<IPrivateKeyStore[]> {
    return this.tbSDK.getTKeyStore(this.moduleName) as Promise<IPrivateKeyStore[]>;
  }

  async getAccounts(): Promise<BN[]> {
    try {
      // Get all private keys
      const privateKeys = await this.getPrivateKeys();
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
