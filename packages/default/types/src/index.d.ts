import { StringifiedType, TKeyArgs } from "@tkey/common-types";
import TKey from "@tkey/core";
declare class ThresholdKey extends TKey {
    constructor(args?: TKeyArgs);
    static fromJSON(value: StringifiedType, args?: TKeyArgs): Promise<ThresholdKey>;
}
export default ThresholdKey;
