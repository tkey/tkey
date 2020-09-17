import { TkeyStoreArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";

class TkeyStore implements ISerializable {
  seedPhrase?: string;

  privateKeys?: Array<string>;

  constructor({ seedPhrase, privateKeys }: TkeyStoreArgs) {
    this.seedPhrase = seedPhrase;
    this.privateKeys = privateKeys;
  }

  toJSON(): StringifiedType {
    return {
      seedPhrase: this.seedPhrase,
      privateKeys: this.privateKeys,
    };
  }

  static fromJSON(value: StringifiedType): TkeyStore {
    const { seedPhrase, privateKeys } = value;
    return new TkeyStore({
      seedPhrase,
      privateKeys,
    });
  }
}
export default TkeyStore;
