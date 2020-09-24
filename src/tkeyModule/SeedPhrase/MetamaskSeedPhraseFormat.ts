// import { post } from "@toruslabs/http-helpers";
import { mnemonicToSeedSync, validateMnemonic } from "bip39";
import BN from "bn.js";
import HDKey from "hdkey";
import { provider } from "web3-core";
import Web3Eth from "web3-eth";
import { fromWei } from "web3-utils";

import { ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "../../baseTypes/aggregateTypes";
import { generateAddressFromPublicKey } from "../../utils";

class MetamaskSeedPhraseFormat implements ISeedPhraseFormat {
  seedPhraseType: string;

  hdPathString: string;

  provider: provider;

  root: HDKey;

  constructor(ethProvider: provider) {
    this.hdPathString = `m/44'/60'/0'/0`;
    this.seedPhraseType = "HD Key Tree";
    this.provider = ethProvider;
  }

  // eslint-disable-next-line class-methods-use-this
  validateSeedPhrase(seedPhrase: string): boolean {
    const parsedSeedPhrase = (seedPhrase || "").trim().toLowerCase().match(/\w+/gu)?.join(" ") || "";
    const wordCount = parsedSeedPhrase.split(/\s/u).length;
    if (wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12) {
      return false;
    }
    return validateMnemonic(seedPhrase);
  }

  deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Array<BN> {
    const mmStore = seedPhraseStore as MetamaskSeedPhraseStore;
    const { seedPhrase } = mmStore;
    const seed = mnemonicToSeedSync(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    const root = hdkey.derive(this.hdPathString);

    const numOfWallets = mmStore.numberOfWallets;
    const wallets = [];
    for (let i = 0; i < numOfWallets; i += 1) {
      const child = root.deriveChild(i);
      const wallet = new BN(child.privateKey);
      wallets.push(wallet);
    }
    return wallets;
  }

  async createSeedPhraseStore(seedPhrase: string): Promise<MetamaskSeedPhraseStore> {
    let numberOfWallets = 0;
    let lastBalance: string;
    const web3 = new Web3Eth(this.provider);
    const hdkey = HDKey.fromMasterSeed(seedPhrase);
    const root = hdkey.derive(this.hdPathString);

    // seek out the first zero balance
    while (lastBalance !== "0") {
      const wallet = root.deriveChild(numberOfWallets);
      const address = generateAddressFromPublicKey(wallet.publicKey);

      // eslint-disable-next-line no-await-in-loop
      lastBalance = await web3.getBalance(address);
      lastBalance = fromWei(lastBalance);

      numberOfWallets += 1;
    }

    return {
      seedPhraseType: this.seedPhraseType,
      seedPhrase,
      numberOfWallets,
    };
  }
}
export default MetamaskSeedPhraseFormat;
