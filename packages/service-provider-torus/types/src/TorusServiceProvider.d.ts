import { StringifiedType, TorusServiceProviderArgs } from "@tkey/common-types";
import ServiceProviderBase from "@tkey/service-provider-base";
import DirectWebSDK, { AggregateLoginParams, DirectWebSDKArgs, HybridAggregateLoginParams, InitParams, SubVerifierDetails, TorusAggregateLoginResponse, TorusHybridAggregateLoginResponse, TorusLoginResponse } from "@toruslabs/torus-direct-web-sdk";
declare class TorusServiceProvider extends ServiceProviderBase {
    directWeb: DirectWebSDK;
    directParams: DirectWebSDKArgs;
    constructor({ enableLogging, postboxKey, directParams }: TorusServiceProviderArgs);
    init(params: InitParams): Promise<void>;
    triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse>;
    triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse>;
    triggerHybirdLogin(params: HybridAggregateLoginParams): Promise<TorusHybridAggregateLoginResponse>;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): TorusServiceProvider;
}
export default TorusServiceProvider;
