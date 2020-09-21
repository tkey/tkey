import bip39 from "bip39";
import * as HDkey from "hdkey";

import { ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "../../baseTypes/aggregateTypes";

class MetamaskSeedPhraseFormat implements ISeedPhraseFormat {
  seedPhraseType: string;

  hdPathString: string;

  type: string;

  constructor() {
    this.hdPathString = `m/44'/60'/0'/0`;
    this.type = "HD Key Tree";
  }

  // eslint-disable-next-line class-methods-use-this
  validateSeedPhrase(seedPhrase: string): boolean {
    const parsedSeedPhrase = (seedPhrase || "").trim().toLowerCase().match(/\w+/gu)?.join(" ") || "";
    const wordCount = parsedSeedPhrase.split(/\s/u).length;
    if (wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12) {
      return false;
    }
    if (!bip39.validateMnemonic(seedPhrase)) {
      return false;
    }
    return true;
  }

  deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Array<BN> {
    const mmStore = seedPhraseStore as MetamaskSeedPhraseStore;
    const { seedPhrase } = mmStore;
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const hdkey = HDkey.fromMasterSeed(seed);
    const root = hdkey.derivePath(this.hdPathString);

    const numOfWallets = mmStore.numberOfWallets;
    const wallets = [];
    for (let i = 0; i < numOfWallets; i += 1) {
      const child = root.deriveChild(i);
      const wallet = child.getWallet();
      wallets.push(wallet);
    }
    const hexWallets = wallet.map((w) => {
      return new BN(sigUtil.normalize(w.getAddress().toString("hex")), "hex");
    });
  }

  formSeedPhraseStore(seedPhrase: string): Promise<ISeedPhraseStore> {
    //   // include check for keys with money here and log on the seedPhrase module
    //   // data.seedPhraseModule.numberOfKeys = 14
    // }
  }
}

const normarlize = function (input: : number | string) : string{
    if (!input) {
        return undefined;
      }
    
      if (typeof input === 'number') {
        const buffer = ethUtil.toBuffer(input);
        input = ethUtil.bufferToHex(buffer);
      }
    
      if (typeof input !== 'string') {
        let msg = 'eth-sig-util.normalize() requires hex string or integer input.';
        msg += ` received ${typeof input}: ${input}`;
        throw new Error(msg);
      }
    
      return ethUtil.addHexPrefix(input.toLowerCase());
} 
export default MetamaskSeedPhraseFormat;
