import { StringifiedType, TorusServiceProviderArgs } from "@tkey/common-types";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import CustomAuth, {
  AggregateLoginParams,
  CustomAuthArgs,
  HybridAggregateLoginParams,
  InitParams,
  SubVerifierDetails,
  TorusAggregateLoginResponse,
  TorusHybridAggregateLoginResponse,
  TorusLoginResponse,
} from "@toruslabs/customauth";
import Torus, { TorusKey } from "@toruslabs/torus.js";
import BN from "bn.js";

class TorusServiceProvider extends ServiceProviderBase {
  customAuthInstance: CustomAuth;

  singleLoginKey: BN;

  public torusKey: TorusKey;

  customAuthArgs: CustomAuthArgs;

  constructor({ enableLogging = false, postboxKey, customAuthArgs }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.customAuthArgs = customAuthArgs;
    this.customAuthInstance = new CustomAuth(customAuthArgs);
    this.serviceProviderName = "TorusServiceProvider";
  }

  static fromJSON(value: StringifiedType): TorusServiceProvider {
    const { enableLogging, postboxKey, customAuthArgs, serviceProviderName } = value;
    if (serviceProviderName !== "TorusServiceProvider") return undefined;

    return new TorusServiceProvider({
      enableLogging,
      postboxKey,
      customAuthArgs,
    });
  }

  async init(params: InitParams): Promise<void> {
    return this.customAuthInstance.init(params);
  }

  async triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse> {
    const obj = await this.customAuthInstance.triggerLogin(params);
    const localPrivKey = Torus.getPostboxKey(obj);
    this.torusKey = obj;
    this.postboxKey = new BN(localPrivKey, "hex");
    return obj;
  }

  async triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse> {
    const obj = await this.customAuthInstance.triggerAggregateLogin(params);
    const localPrivKey = Torus.getPostboxKey(obj);
    this.torusKey = obj;
    this.postboxKey = new BN(localPrivKey, "hex");
    return obj;
  }

  async triggerHybridAggregateLogin(params: HybridAggregateLoginParams): Promise<TorusHybridAggregateLoginResponse> {
    const obj = await this.customAuthInstance.triggerHybridAggregateLogin(params);
    const aggregateLoginKey = Torus.getPostboxKey(obj.aggregateLogins[0]);
    const singleLoginKey = Torus.getPostboxKey(obj.singleLogin);
    this.torusKey = null;
    this.postboxKey = new BN(aggregateLoginKey, "hex");
    this.singleLoginKey = new BN(singleLoginKey, "hex");
    return obj;
  }

  toJSON(): StringifiedType {
    return {
      ...super.toJSON(),
      serviceProviderName: this.serviceProviderName,
      customAuthArgs: this.customAuthArgs,
    };
  }
}

export default TorusServiceProvider;
