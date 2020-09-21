import bip39 from "bip39";
import BN from "bn.js";
import * as HDkey from "hdkey";
import normalize from "../../utils"
import { post } from "@toruslabs/http-helpers";

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
    const root = hdkey.derive(this.hdPathString);

    const numOfWallets = mmStore.numberOfWallets;
    const wallets = [];
    for (let i = 0; i < numOfWallets; i += 1) {
      const child = root.deriveChild(i);
      const wallet = child.getWallet();
      wallets.push(wallet);
    }
    return wallets;
    // const hexWallets = wallet.map((w) => {
    //   return new BN(sigUtil.normalize(w.getAddress().toString("hex")), "hex");
    // });
  }

  createSeedPhraseStore(seedPhrase: string): Promise<MetamaskSeedPhraseStore> {
    //   // include check for keys with money here and log on the seedPhrase module
    //   // data.seedPhraseModule.numberOfKeys = 14
    // }

    let numberOfWallets = 0
    let lastBalance
    // seek out the first zero balance
    while (lastBalance !== '0x0') {
      lastBalance = await post("https://api.infura.io/v1/jsonrpc/mainnet", { "jsonrpc":"2.0","method":"eth_getBalance","params": ["0xc94770007dda54cF92009BFF0dE90c06F603a09f", "latest"],"id":1})
    }
    
    let store = {
      seedPhraseType: this.type,
      seedPhrase: seedPhrase,
      numberOfWallets: number;
    }
  }
}
export default MetamaskSeedPhraseFormat;
