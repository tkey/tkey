import { PointHex, SfaServiceProviderArgs, StringifiedType } from "@tkey-mpc/common-types";
import { ServiceProviderBase } from "@tkey-mpc/service-provider-base";
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

  async connect(params: LoginParams): Promise<BN> {
    const privKey = await this.web3AuthInstance.getPostboxKey(params);
    this.postboxKey = new BN(privKey, "hex");
    return this.postboxKey;
  }

  async getTSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    if (!this.verifierName) throw new Error("no verifierName, not logged in");
    if (!this.web3AuthInstance.nodeDetailManagerInstance) throw new Error("web3auth instance is not initialized");

    const { torusNodeTSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } =
      await this.web3AuthInstance.nodeDetailManagerInstance.getNodeDetails({
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
    if (!this.web3AuthInstance.nodeDetailManagerInstance) throw new Error("web3auth instance is not initialized");

    const { torusNodeSSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } =
      await this.web3AuthInstance.nodeDetailManagerInstance.getNodeDetails({
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
    if (!this.web3AuthInstance.nodeDetailManagerInstance) throw new Error("web3auth instance is not initialized");
    const { torusNodeRSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } =
      await this.web3AuthInstance.nodeDetailManagerInstance.getNodeDetails({
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
