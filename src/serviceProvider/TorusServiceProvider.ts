import DirectWebSDK from "@toruslabs/torus-direct-web-sdk";
// eslint-disable-next-line import/no-unresolved
import { AggregateLoginParams, TorusAggregateLoginResponse } from "@toruslabs/torus-direct-web-sdk/types/src/handlers/interfaces";
import BN from "bn.js";

import { TorusServiceProviderArgs } from "../base/commonTypes";
import ServiceProviderBase from "./ServiceProviderBase";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: DirectWebSDK;

  constructor({
    enableLogging = false,
    postboxKey = "d573b6c7d8fe4ec7cbad052189d4a8415b44d8b87af024872f38db3c694d306d",
    directParams,
  }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.directWeb = new DirectWebSDK(directParams);
  }

  async triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse> {
    const obj = await this.directWeb.triggerAggregateLogin(params);
    this.postboxKey = new BN(obj.privateKey, "hex");
    return obj;
  }
}

export default TorusServiceProvider;
