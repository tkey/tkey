import BN from "bn.js";
import HDKey from "hdkey";
import { provider } from "web3-core";
import { ISeedPhraseFormat, ISeedPhraseStore, MetamaskSeedPhraseStore } from "../baseTypes/aggregateTypes";
declare class MetamaskSeedPhraseFormat implements ISeedPhraseFormat {
    seedPhraseType: string;
    hdPathString: string;
    provider: provider;
    root: HDKey;
    constructor(ethProvider: provider);
    validateSeedPhrase(seedPhrase: string): boolean;
    deriveKeysFromSeedPhrase(seedPhraseStore: ISeedPhraseStore): Array<BN>;
    createSeedPhraseStore(seedPhrase: string): Promise<MetamaskSeedPhraseStore>;
}
export default MetamaskSeedPhraseFormat;
