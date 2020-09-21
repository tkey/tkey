import { TkeyStoreArgs, TkeyStoreDataArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";
declare class TkeyStore implements ISerializable {
    data: TkeyStoreDataArgs;
    constructor({ data }: TkeyStoreArgs);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TkeyStore;
}
export default TkeyStore;
