import DirectWebSDK, { AggregateLoginParams, InitParams, SubVerifierDetails, TorusAggregateLoginResponse, TorusLoginResponse } from "@toruslabs/torus-direct-web-sdk";
import { TorusServiceProviderArgs } from "../base/commonTypes";
import ServiceProviderBase from "./ServiceProviderBase";
declare class TorusServiceProvider extends ServiceProviderBase {
    directWeb: DirectWebSDK;
    constructor({ enableLogging, postboxKey, directParams }: TorusServiceProviderArgs);
    init(params: InitParams): Promise<void>;
    triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse>;
    triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse>;
}
export default TorusServiceProvider;
