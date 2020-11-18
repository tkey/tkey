import { StringifiedType, TorusServiceProviderArgs } from "@tkey/common-types";
import ServiceProviderBase from "@tkey/service-provider-base";
import DirectWebSDK, {
  AggregateLoginParams,
  DirectWebSDKArgs,
  HybridAggregateLoginParams,
  InitParams,
  SubVerifierDetails,
  TorusAggregateLoginResponse,
  TorusHybridAggregateLoginResponse,
  TorusLoginResponse,
} from "@toruslabs/torus-direct-web-sdk";
import BN from "bn.js";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: DirectWebSDK;

  singleLoginKey: BN;

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

  async triggerHybridAggregateLogin(params: HybridAggregateLoginParams): Promise<TorusHybridAggregateLoginResponse> {
    const obj = await this.directWeb.triggerHybridAggregateLogin(params);
    const aggregateLoginKey = obj.aggregateLogins[0].privateKey;
    this.postboxKey = new BN(aggregateLoginKey, "hex");
    this.singleLoginKey = new BN(obj.singleLogin.privateKey, "hex");
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
