import ServiceProviderBase from "@tkey/service-provider-base";
import { StringifiedType, TorusServiceProviderArgs } from "@tkey/types";
import DirectWebSDK, { AggregateLoginParams, DirectWebSDKArgs, InitParams, SubVerifierDetails, TorusAggregateLoginResponse, TorusLoginResponse } from "@toruslabs/torus-direct-web-sdk";
declare class TorusServiceProvider extends ServiceProviderBase {
    directWeb: DirectWebSDK;
    directParams: DirectWebSDKArgs;
    constructor({ enableLogging, postboxKey, directParams }: TorusServiceProviderArgs);
    init(params: InitParams): Promise<void>;
    triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse>;
    triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TorusServiceProvider;
}
export default TorusServiceProvider;
