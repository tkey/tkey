// import { TkeyStoreArgs, TkeyStoreDataArgs } from "../baseTypes/aggregateTypes";
// import { ISerializable, StringifiedType } from "../baseTypes/commonTypes";

// class TkeyStore implements ISerializable {
//   constructor({ data }: TkeyStoreArgs) {
//     Object.keys(data).forEach((el) => {
//       this[el] = data[el];
//     });
//   }

//   toJSON(): StringifiedType {
//     return this;
//   }

//   static fromJSON(value: StringifiedType): TkeyStore {
//     const { data } = value;
//     return new TkeyStore({
//       this,
//     });
//   }
// }

// export default TkeyStore;
