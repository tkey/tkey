import { TkeyStoreArgs, TkeyStoreDataArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";

class TkeyStore implements ISerializable {
  data: TkeyStoreDataArgs;

  constructor({ data }: TkeyStoreArgs) {
    this.data = data;
  }

  toJSON(): StringifiedType {
    return {
      data: this.data,
    };
  }

  static fromJSON(value: StringifiedType): TkeyStore {
    const { data } = value;
    return new TkeyStore({
      data,
    });
  }
}

export default TkeyStore;
