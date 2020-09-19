import { IModule, ISubTkeyModule, ITKeyApi, TkeyStoreDataArgs } from "../../baseTypes/aggregateTypes";
// import { ecCurve } from "../utils";
import TkeyModule from "../TkeyModule";

class PrivateKeysModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  tkeyModule: ISubTkeyModule;

  constructor() {
    this.moduleName = "privateKeysModule";
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tkeyModule = new TkeyModule();
    this.tkeyModule.setModuleReferences(tbSDK);
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setPrivateKeys(privateKeys: Array<string>): Promise<void> {
    await this.tkeyModule.setData({ privateKeysModule: privateKeys });
  }

  async getPrivateKeys(): Promise<TkeyStoreDataArgs> {
    const seedPhrase = await this.tkeyModule.getData([this.moduleName]);
    return seedPhrase;
  }
}

export default PrivateKeysModule;
