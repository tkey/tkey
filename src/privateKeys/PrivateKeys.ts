import BN from "bn.js";

import { IModule, IPrivateKeyFormat, ISECP256k1NStore, ITKeyApi } from "../baseTypes/aggregateTypes";

class PrivateKeyModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  privateKeyFormats: IPrivateKeyFormat[];

  constructor(formats: IPrivateKeyFormat[]) {
    this.moduleName = "privateKeyModule";
    this.privateKeyFormats = formats;
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tbSDK.addReconstructKeyMiddleware(this.moduleName, this.getAccounts.bind(this));
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setPrivateKeys(privateKeys: BN[], privateKeyType: string): Promise<void> {
    const data = {};
    const format = this.privateKeyFormats.find((el) => el.privateKeyType === privateKeyType);
    if (!format) {
      throw new Error("Private key type is not supported");
    }
    data[privateKeyType] = await format.createPrivateKeyStore(privateKeys);
    return this.tbSDK.setTKeyStore(this.moduleName, data);
  }

  async getPrivateKeys(key: string): Promise<unknown> {
    return this.tbSDK.getTKeyStore(this.moduleName, key);
  }

  async getAccounts(): Promise<Array<BN>> {
    try {
      // Get all private keys
      const promisesArray = this.privateKeyFormats.map((el) => {
        return this.getPrivateKeys(el.privateKeyType);
      });
      const results = (await Promise.all(promisesArray)) as [ISECP256k1NStore];
      return results.reduce((acc, el) => {
        const bns = el.privateKeys.map((pl) => {
          return new BN(pl, "hex");
        });
        acc.push(...bns);
        return acc;
      }, []);
    } catch (err) {
      return [];
    }
  }
}

export default PrivateKeyModule;
