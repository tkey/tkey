import { SeedPhraseStoreArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";

class SeedPhraseStore implements ISerializable {
  seedPhrase: string;

  constructor({ seedPhrase }: SeedPhraseStoreArgs) {
    this.seedPhrase = seedPhrase;
  }

  toJSON(): StringifiedType {
    return {
      seedPhrase: this.seedPhrase,
    };
  }

  static fromJSON(value: StringifiedType): SeedPhraseStore {
    const { seedPhrase } = value;
    return new SeedPhraseStore({
      seedPhrase,
    });
  }
}
export default SeedPhraseStore;
