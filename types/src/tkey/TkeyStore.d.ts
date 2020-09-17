import { TkeyStoreArgs } from "../baseTypes/aggregateTypes";
import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";
declare class TkeyStore implements ISerializable {
    seedPhrase: string;
    constructor({ seedPhrase }: TkeyStoreArgs);
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TkeyStore;
}
export default TkeyStore;
