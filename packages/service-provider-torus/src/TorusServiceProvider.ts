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

  public migratableKey: BN | null = null;

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

  /**
   * Trigger login flow. Returns `null` in redirect mode.
   */
  async triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse | null> {
    const obj = await this.customAuthInstance.triggerLogin(params);

    // `obj` maybe `null` in redirect mode.
    if (obj) {
      const localPrivKey = Torus.getPostboxKey(obj);
      this.torusKey = obj;

      if (!obj.metadata.upgraded) {
        const { finalKeyData, oAuthKeyData } = obj;
        const privKey = finalKeyData.privKey || oAuthKeyData.privKey;
        this.migratableKey = new BN(privKey, "hex");
      }

      this.postboxKey = new BN(localPrivKey, "hex");
    }

    return obj;
  }

  /**
   * Trigger login flow. Returns `null` in redirect mode.
   */
  async triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse> {
    const obj = await this.customAuthInstance.triggerAggregateLogin(params);

    if (obj) {
      const localPrivKey = Torus.getPostboxKey(obj);
      this.torusKey = obj;

      if (!obj.metadata.upgraded) {
        const { finalKeyData, oAuthKeyData } = obj;
        const privKey = finalKeyData.privKey || oAuthKeyData.privKey;
        this.migratableKey = new BN(privKey, "hex");
      }

      this.postboxKey = new BN(localPrivKey, "hex");
    }
    return obj;
  }

  /**
   * Trigger login flow. Returns `null` in redirect mode.
   */
  async triggerHybridAggregateLogin(params: HybridAggregateLoginParams): Promise<TorusHybridAggregateLoginResponse> {
    const obj = await this.customAuthInstance.triggerHybridAggregateLogin(params);
    this.torusKey = null; // Since there are multiple keys, we don't set the torusKey here.

    // `obj` maybe `null` in redirect mode.
    if (obj) {
      const aggregateLoginKey = Torus.getPostboxKey(obj.aggregateLogins[0]);
      const singleLoginKey = Torus.getPostboxKey(obj.singleLogin);
      this.postboxKey = new BN(aggregateLoginKey, "hex");
      this.singleLoginKey = new BN(singleLoginKey, "hex");
    }

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
