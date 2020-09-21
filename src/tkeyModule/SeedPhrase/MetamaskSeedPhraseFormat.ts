import { post } from "@toruslabs/http-helpers";
import { mnemonicToSeedSync, validateMnemonic } from "bip39";
import BN from "bn.js";
import * as HDkey from "hdkey";

import { ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "../../baseTypes/aggregateTypes";
import { normalize } from "../../utils";

type EthRPCResponse = {
  result: string;
};

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
    if (!validateMnemonic(seedPhrase)) {
      return false;
    }
    return true;
  }

  deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Array<BN> {
    const mmStore = seedPhraseStore as MetamaskSeedPhraseStore;
    const { seedPhrase } = mmStore;
    const seed = mnemonicToSeedSync(seedPhrase);
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

  async createSeedPhraseStore(seedPhrase: string): Promise<MetamaskSeedPhraseStore> {
    //   // include check for keys with money here and log on the seedPhrase module
    //   // data.seedPhraseModule.numberOfKeys = 14
    // }

    let numberOfWallets = 0;
    let lastBalance;
    const seed = mnemonicToSeedSync(seedPhrase);
    const hdkey = HDkey.fromMasterSeed(seed);
    const root = hdkey.derive(this.hdPathString);
    // seek out the first zero balance
    while (lastBalance !== "0x0") {
      const wallet = root.deriveChild(numberOfWallets);
      const pubkey = normalize(wallet._publicKey);
      // eslint-disable-next-line no-await-in-loop
      const response = (await post("https://mainnet.infura.io/v3/53fffdd505fa49d48f68da1b80997121", {
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [pubkey, "latest"],
        id: 1,
      })) as EthRPCResponse;
      lastBalance = response.result;
      debugger;
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
