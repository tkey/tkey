import DirectWebSDK from "@toruslabs/torus-direct-web-sdk";
import { AggregateLoginParams, TorusAggregateLoginResponse } from "@toruslabs/torus-direct-web-sdk/types/src/handlers/interfaces";
import { TorusServiceProviderArgs } from "../base/commonTypes";
import ServiceProviderBase from "./ServiceProviderBase";
declare class TorusServiceProvider extends ServiceProviderBase {
    directWeb: DirectWebSDK;
    constructor({ enableLogging, postboxKey, directParams, }: TorusServiceProviderArgs);
    triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse>;
}
export default TorusServiceProvider;
