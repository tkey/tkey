import DirectWebSDK, {
  AggregateLoginParams,
  InitParams,
  SubVerifierDetails,
  TorusAggregateLoginResponse,
  TorusLoginResponse,
} from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

import { TorusServiceProviderArgs } from "../base/commonTypes";
import ServiceProviderBase from "./ServiceProviderBase";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: DirectWebSDK;

  constructor({ enableLogging = false, postboxKey, directParams }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.directWeb = new DirectWebSDK(directParams);
  }

  async init(params: InitParams): Promise<void> {
    return this.directWeb.init(params);
  }

  async triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse> {
    const obj = await this.directWeb.triggerLogin(params);
    this.postboxKey = new BN(obj.privateKey, "hex");
    return obj;
  }

  async triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse> {
    const obj = await this.directWeb.triggerAggregateLogin(params);
    this.postboxKey = new BN(obj.privateKey, "hex");
    return obj;
  }
}

export default TorusServiceProvider;
