import { generateID, ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "@tkey/common-types";
import BN from "bn.js";
import { HDNodeWallet, Mnemonic, Provider } from "ethers";

class MetamaskSeedPhraseFormat implements ISeedPhraseFormat {
  type: string;

  provider: Provider;

  hdPathString: string;

  constructor(ethProvider: Provider) {
    this.type = "HD Key Tree";
    this.hdPathString = "m/44'/60'/0'/0";
    this.provider = ethProvider;
  }

  validateSeedPhrase(seedPhrase: string): boolean {
    const parsedSeedPhrase = (seedPhrase || "").trim().toLowerCase().match(/\w+/gu)?.join(" ") || "";
    const wordCount = parsedSeedPhrase.split(/\s/u).length;
    if (wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12) {
      return false;
    }
    return Mnemonic.isValidMnemonic(parsedSeedPhrase);
  }

  async deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Promise<BN[]> {
    const mmStore = seedPhraseStore as MetamaskSeedPhraseStore;
    const { seedPhrase } = mmStore;
    const hdkey = HDNodeWallet.fromPhrase(seedPhrase, "", this.hdPathString);
    const root = hdkey.derivePath(this.hdPathString);
    const numOfWallets = mmStore.numberOfWallets;
    const wallets: BN[] = [];
    for (let i = 0; i < numOfWallets; i += 1) {
      const child = root.deriveChild(i);
      const wallet = new BN(child.privateKey.slice(2), "hex");
      wallets.push(wallet);
    }
    return wallets;
  }

  async createSeedPhraseStore(seedPhrase?: string): Promise<MetamaskSeedPhraseStore> {
    let numberOfWallets = 1;
    let lastBalance: bigint;
    const hdkey = seedPhrase ? HDNodeWallet.fromPhrase(seedPhrase, "", this.hdPathString) : HDNodeWallet.createRandom("", this.hdPathString);
    const root = hdkey.derivePath(this.hdPathString);
    // seek out the first zero balance
    while (lastBalance !== BigInt(0)) {
      const wallet = root.deriveChild(numberOfWallets);
      console.log(wallet.address, wallet.privateKey);
      lastBalance = await this.provider.getBalance(wallet.address);
      numberOfWallets += 1;
    }

    const obj = {
      id: generateID(),
      type: this.type,
      seedPhrase: hdkey.mnemonic.phrase,
      numberOfWallets,
    };
    return obj;
  }
}
export default MetamaskSeedPhraseFormat;
