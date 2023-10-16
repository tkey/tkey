import { generateAddressFromPublicKey, generateID, ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "@oraichain/common-types";
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from "bip39";
import BN from "bn.js";
import HDKey from "hdkey";
import { provider } from "web3-core";
import { fromWei } from "web3-utils";

import Web3Eth from "./web3";

class MetamaskSeedPhraseFormat implements ISeedPhraseFormat {
  type: string;

  hdPathString: string;

  provider: provider;

  root: HDKey;

  constructor(ethProvider: provider) {
    this.hdPathString = `m/44'/60'/0'/0`;
    this.type = "HD Key Tree";
    this.provider = ethProvider;
  }

  validateSeedPhrase(seedPhrase: string): boolean {
    const parsedSeedPhrase = (seedPhrase || "").trim().toLowerCase().match(/\w+/gu)?.join(" ") || "";
    const wordCount = parsedSeedPhrase.split(/\s/u).length;
    if (wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12) {
      return false;
    }
    return validateMnemonic(seedPhrase);
  }

  async deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Promise<BN[]> {
    const mmStore = seedPhraseStore as MetamaskSeedPhraseStore;
    const { seedPhrase } = mmStore;
    const seed = await mnemonicToSeed(seedPhrase);
    const hdkey = HDKey.fromMasterSeed(seed);
    const root = hdkey.derive(this.hdPathString);

    const numOfWallets = mmStore.numberOfWallets;
    const wallets: BN[] = [];
    for (let i = 0; i < numOfWallets; i += 1) {
      const child = root.deriveChild(i);
      const wallet = new BN(child.privateKey);
      wallets.push(wallet);
    }
    return wallets;
  }

  async createSeedPhraseStore(seedPhrase?: string): Promise<MetamaskSeedPhraseStore> {
    let numberOfWallets = 0;
    const finalSeedPhrase = seedPhrase || generateMnemonic();
    let lastBalance: string;
    const web3 = new Web3Eth(this.provider);
    const hdkey = HDKey.fromMasterSeed(finalSeedPhrase);
    const root = hdkey.derive(this.hdPathString);

    // seek out the first zero balance
    while (lastBalance !== "0") {
      const wallet = root.deriveChild(numberOfWallets);
      const address = generateAddressFromPublicKey(wallet.publicKey);

      lastBalance = await web3.getBalance(address);
      lastBalance = fromWei(lastBalance);

      numberOfWallets += 1;
    }

    return {
      id: generateID(),
      type: this.type,
      seedPhrase: finalSeedPhrase,
      numberOfWallets,
    };
  }
}
export default MetamaskSeedPhraseFormat;
