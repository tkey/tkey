import DirectWebSDK, {
  AggregateLoginParams,
  DirectWebSDKArgs,
  InitParams,
  SubVerifierDetails,
  TorusAggregateLoginResponse,
  TorusLoginResponse,
} from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

import { StringifiedType, TorusServiceProviderArgs } from "../baseTypes/commonTypes";
import ServiceProviderBase from "./ServiceProviderBase";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: DirectWebSDK;

  directParams: DirectWebSDKArgs;

  constructor({ enableLogging = false, postboxKey, directParams }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.directParams = directParams;
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

  toJSON(): StringifiedType {
    return {
      ...super.toJSON(),
      directParams: this.directParams,
    };
  }

  static fromJSON(value: StringifiedType): TorusServiceProvider {
    const { enableLogging, postboxKey, directParams } = value;
    return new TorusServiceProvider({
      enableLogging,
      postboxKey,
      directParams,
    });
  }
}

export default TorusServiceProvider;
