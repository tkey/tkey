import { PointHex, SfaServiceProviderArgs, StringifiedType } from "@tkey-mpc/common-types";
import { ServiceProviderBase } from "@tkey-mpc/service-provider-base";
import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import type { SafeEventEmitterProvider } from "@web3auth/base";
import { LoginParams, PrivateKeyProvider, Web3Auth, Web3AuthOptions } from "@web3auth/single-factor-auth";
import BN from "bn.js";

class SfaServiceProvider extends ServiceProviderBase {
  web3AuthOptions: Web3AuthOptions;

  web3AuthInstance: Web3Auth;

  nodeDetailsManager: NodeDetailManager;

  constructor({ enableLogging = false, postboxKey, web3AuthOptions }: SfaServiceProviderArgs) {
    super({ enableLogging, postboxKey });

    this.web3AuthOptions = web3AuthOptions;
    this.web3AuthInstance = new Web3Auth(web3AuthOptions);
    this.serviceProviderName = "SfaServiceProvider";
    this.nodeDetailsManager = new NodeDetailManager({
      network: this.web3AuthInstance.options.web3AuthNetwork,
    });
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

  async getTSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    if (!this.verifierName) throw new Error("no verifierName, not logged in");

    const { torusNodeTSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } = await this.nodeDetailsManager.getNodeDetails({
      verifier: this.verifierName,
      verifierId: this.verifierId,
    });

    return {
      serverEndpoints: tssNodeEndpoints,
      serverPubKeys: torusPubKeys.map((key) => {
        return {
          x: key.X,
          y: key.Y,
        };
      }),
      serverThreshold: Math.ceil(tssNodeEndpoints.length / 2),
    };
  }

  async getSSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    if (!this.verifierName) throw new Error("no verifierName, not logged in");

    const { torusNodeSSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } = await this.nodeDetailsManager.getNodeDetails({
      verifier: this.verifierName,
      verifierId: this.verifierId,
    });
    return {
      serverEndpoints: tssNodeEndpoints,
      serverPubKeys: torusPubKeys.map((key) => {
        return {
          x: key.X,
          y: key.Y,
        };
      }),
      serverThreshold: Math.ceil(tssNodeEndpoints.length / 2),
    };
  }

  async getRSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    if (!this.verifierName) throw new Error("no verifierName, not logged in");

    const { torusNodeRSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } = await this.nodeDetailsManager.getNodeDetails({
      verifier: this.verifierName,
      verifierId: this.verifierId,
    });

    return {
      serverEndpoints: tssNodeEndpoints,
      serverPubKeys: torusPubKeys.map((key) => {
        return {
          x: key.X,
          y: key.Y,
        };
      }),
      serverThreshold: Math.ceil(tssNodeEndpoints.length / 2),
    };
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
