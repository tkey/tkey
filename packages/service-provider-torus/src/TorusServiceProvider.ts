import { StringifiedType, TorusServiceProviderArgs } from "@tkey/common-types";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import { CustomAuth, CustomAuthArgs, CustomAuthLoginParams, InitParams, TorusLoginResponse } from "@toruslabs/customauth";
import { Torus, TorusKey } from "@toruslabs/torus.js";
import BN from "bn.js";

class TorusServiceProvider extends ServiceProviderBase {
  customAuthInstance: CustomAuth;

  singleLoginKey: BN;

  public torusKey: TorusKey;

  public migratableKey: BN | null = null; // Migration of key from SFA to tKey

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
  async triggerLogin(params: CustomAuthLoginParams): Promise<TorusLoginResponse | null> {
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

  toJSON(): StringifiedType {
    return {
      ...super.toJSON(),
      serviceProviderName: this.serviceProviderName,
      customAuthArgs: this.customAuthArgs,
    };
  }
}

export default TorusServiceProvider;
