import { TkeyStoreArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";

class TkeyStore implements ISerializable {
  seedPhrase: string;

  constructor({ seedPhrase }: TkeyStoreArgs) {
    this.seedPhrase = seedPhrase;
  }

  toJSON(): StringifiedType {
    return {
      seedPhrase: this.seedPhrase,
    };
  }

  static fromJSON(value: StringifiedType): TkeyStore {
    const { seedPhrase } = value;
    return new TkeyStore({
      seedPhrase,
    });
  }
}
export default TkeyStore;
