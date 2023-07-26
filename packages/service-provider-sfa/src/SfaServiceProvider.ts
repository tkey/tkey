import { SfaServiceProviderArgs, StringifiedType } from "@tkey/common-types";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import type { SafeEventEmitterProvider } from "@web3auth/base";
import { LoginParams, PrivateKeyProvider, Web3Auth, Web3AuthOptions } from "@web3auth/single-factor-auth";
import BN from "bn.js";

class SfaServiceProvider extends ServiceProviderBase {
  web3AuthOptions: Web3AuthOptions;

  web3AuthInstance: Web3Auth;

  constructor({ enableLogging = false, postboxKey, web3AuthOptions }: SfaServiceProviderArgs) {
    super({ enableLogging, postboxKey });

    this.web3AuthOptions = web3AuthOptions;
    this.web3AuthInstance = new Web3Auth(web3AuthOptions);
    this.serviceProviderName = "SfaServiceProvider";
  }

  static fromJSON(value: StringifiedType): SfaServiceProvider {
    const { enableLogging, postboxKey, web3AuthOptions, serviceProviderName } = value;
    if (serviceProviderName !== "SfaServiceProvider") return undefined;

    return new SfaServiceProvider({
      enableLogging,
      postboxKey,
      web3AuthOptions,
    });
  }

  async init(params: PrivateKeyProvider): Promise<void> {
    return this.web3AuthInstance.init(params);
  }

  async connect(params: LoginParams): Promise<SafeEventEmitterProvider> {
    const provider = await this.web3AuthInstance.connect(params);
    const localPrivKey = await provider.request<string>({ method: "private_key" });
    this.postboxKey = new BN(localPrivKey, "hex");
    return provider;
  }

  toJSON(): StringifiedType {
    return {
      ...super.toJSON(),
      serviceProviderName: this.serviceProviderName,
      web3AuthOptions: this.web3AuthOptions,
    };
  }
}

export default SfaServiceProvider;
