import { StringifiedType, TorusServiceProviderArgs, IPoint, BNString, ShareStore } from "@tkey/common-types";
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
import BN from "bn.js";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: CustomAuth;

  singleLoginKey: BN;

  directParams: CustomAuthArgs;

  constructor({ enableLogging = false, postboxKey, directParams }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.directParams = directParams;
    this.directWeb = new CustomAuth(directParams);
    this.serviceProviderName = "TorusServiceProvider";
  }

  static fromJSON(value: StringifiedType): TorusServiceProvider {
    const { enableLogging, postboxKey, directParams, serviceProviderName } = value;
    if (serviceProviderName !== "TorusServiceProvider") return undefined;

    return new TorusServiceProvider({
      enableLogging,
      postboxKey,
      directParams,
    });
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



  // Added items for TSSKey
  getTSSPk(): IPoint {
    return this.nodeTSSPk
  } // for now is just sum of key
  getTSSsign(msg: BNString, otherShares: ShareStore[]): Buffer {
    return Buffer.from("test");
  }

  toJSON(): StringifiedType {
    return {
      ...super.toJSON(),
      serviceProviderName: this.serviceProviderName,
      directParams: this.directParams,
    };
  }
}

export default TorusServiceProvider;
