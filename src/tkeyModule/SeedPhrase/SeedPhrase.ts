// import * as HdKeyring from "eth-hd-keyring";

import HdKeyring from "eth-hd-keyring";

import { IModule, ISubTkeyModule, ITKeyApi, TkeyStoreDataArgs } from "../../baseTypes/aggregateTypes";
// import { ecCurve } from "../utils";
import TkeyModule from "../TkeyModule";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  tkeyModule: ISubTkeyModule;

  constructor() {
    this.moduleName = "seedPhraseModule";
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
    this.tkeyModule = new TkeyModule();
    this.tkeyModule.setModuleReferences(tbSDK);
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async setSeedPhrase(seedPhrase: string): Promise<void> {
    await this.tkeyModule.setData({ seedPhraseModule: seedPhrase });
  }

  async getSeedPhrase(): Promise<TkeyStoreDataArgs> {
    const seedPhrase = await this.tkeyModule.getData([this.moduleName]);
    return seedPhrase;
  }

  async getAccounts(numberOfAccounts = 1): Promise<Array<string>> {
    const seedPhrase = await this.getSeedPhrase();
    const seedPhraseString = seedPhrase[this.moduleName];
    const keyring = await new HdKeyring({
      mnemonic: seedPhraseString,
      numberOfAccounts,
    });
    return keyring.wallets;
  }
}

export default SeedPhraseModule;
