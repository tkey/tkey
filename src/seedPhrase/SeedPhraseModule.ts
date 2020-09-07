import bip39 from "bip39";
import BN from "bn.js";

import { IModule, ITKeyApi, KeyDetails } from "../baseTypes/aggregateTypes";
import { ecCurve } from "../utils";

class SeedPhraseModule implements IModule {
  moduleName: string;

  tbSDK: ITKeyApi;

  constructor() {
    this.moduleName = "seedPhrase";
  }

  setModuleReferences(tbSDK: ITKeyApi): void {
    this.tbSDK = tbSDK;
  }

  // eslint-disable-next-line
  async initialize(): Promise<void> {}

  async initializeWithSeedPhrase(seedPhrase: string): Promise<KeyDetails> {
    if (!(seedPhrase.trim().split(/\s+/g).length >= 12 && seedPhrase.trim().split(/\s+/g).length % 3 === 0)) {
      throw new Error("invalid number of words in seed phrase");
    }
    if (bip39.validateMnemonic(seedPhrase)) {
      throw new Error("invalid mnemonic");
    }
    const seed = new BN(bip39.mnemonicToSeedSync(seedPhrase));
    const moddedSeed = seed.umod(ecCurve.curve.n);
    if (seed.cmp(moddedSeed) !== 0) {
      throw new Error("seed phrase not in secp256k1 curve group, you're really unlucky");
    }
    return this.tbSDK.initialize(undefined, seed);
  }
}

export default SeedPhraseModule;
