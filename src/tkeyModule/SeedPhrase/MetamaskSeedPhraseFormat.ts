import { post } from "@toruslabs/http-helpers";
import bip39 from "bip39";
import BN from "bn.js";
import HDNode, * as HDkey from "hdkey";

import { ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "../../baseTypes/aggregateTypes";
import normalize from "../../utils";

class MetamaskSeedPhraseFormat implements ISeedPhraseFormat {
  seedPhraseType: string;

  hdPathString: string;

  type: string;

  root: HDNode;

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
    this.root = hdkey.derive(this.hdPathString);

    const numOfWallets = mmStore.numberOfWallets;
    const wallets = [];
    for (let i = 0; i < numOfWallets; i += 1) {
      const child = this.root.deriveChild(i);
      const wallet = child.getWallet();
      wallets.push(wallet);
    }
    return wallets;
    // const hexWallets = wallet.map((w) => {
    //   return new BN(sigUtil.normalize(w.getAddress().toString("hex")), "hex");
    // });
  }

  async createSeedPhraseStore(seedPhrase: string): Promise<MetamaskSeedPhraseStore> {
    //   // include check for keys with money here and log on the seedPhrase module
    //   // data.seedPhraseModule.numberOfKeys = 14
    // }

    let numberOfWallets = 0;
    let lastBalance;
    // seek out the first zero balance
    while (lastBalance !== "0x0") {
      const wallet = this.root.deriveChild(numberOfWallets);
      const pubkey = wallet._pubkey;
      // eslint-disable-next-line no-await-in-loop
      lastBalance = await post("https://api.infura.io/v1/jsonrpc/mainnet", {
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [pubkey, "latest"],
        id: 1,
      });
      numberOfWallets += 1;
    }

    const store = {
      seedPhraseType: this.type,
      seedPhrase,
      numberOfWallets,
    };

    return store as MetamaskSeedPhraseStore;
  }
}
export default MetamaskSeedPhraseFormat;
