import { hexPoint, Point, PointHex, StringifiedType, TorusServiceProviderArgs } from "@tkey/common-types";
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
import { TorusPublicKey } from "@toruslabs/torus.js";
import BN from "bn.js";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: CustomAuth;

  singleLoginKey: BN;

  customAuthArgs: CustomAuthArgs;

  // tss verifier
  tssVerifier?: string;

  // normal verifier
  verifierName?: string;

  verifierId?: string;

  verifierType?: "normal" | "aggregate" | "hybrid";

  constructor({ enableLogging = false, postboxKey, customAuthArgs, tssVerifier }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.customAuthArgs = customAuthArgs;
    this.directWeb = new CustomAuth(customAuthArgs);
    this.serviceProviderName = "TorusServiceProvider";
    this.tssVerifier = tssVerifier;
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
    return this.directWeb.init(params);
  }

  _setTSSPubKey(tssTag: string, tssNonce: number, tssPubKey: Point): void {
    throw new Error(`this method has been overriden and should not be called with ${tssTag}, ${tssNonce}, ${tssPubKey}`);
  }

  retrieveVerifierId(): string {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    return this.verifierId;
  }

  _setTSSNodeDetails(serverEndpoints: string[], serverPubKeys: PointHex[], serverThreshold: number): void {
    throw new Error(`this method has been overriden and should not be called with ${serverEndpoints}, ${serverPubKeys}, ${serverThreshold}`);
  }

  async getTSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    const nodeDetails = await this.directWeb.nodeDetailManager.getNodeDetails({ verifier: this.tssVerifier, verifierId: this.verifierId });
    const { torusNodeEndpoints, torusNodePub } = nodeDetails;
    return {
      serverEndpoints: torusNodeEndpoints,
      serverPubKeys: torusNodePub.map((nodePub) => hexPoint(new Point(nodePub.X, nodePub.Y))),
      serverThreshold: Math.ceil(torusNodeEndpoints.length / 2),
    };
  }

  async retrieveTSSPubKey(tssTag: string, tssNonce: number): Promise<Point> {
    if (!this.tssVerifier) throw new Error("tssVerifier not specified");
    if (!this.verifierName || !this.verifierId || !this.verifierType) throw new Error("verifier userinfo not found, not logged in yet");
    if (this.verifierType === "normal") {
      const nodeDetails = await this.directWeb.nodeDetailManager.getNodeDetails({ verifier: this.tssVerifier, verifierId: this.verifierId });
      const tssServerPub = (await this.directWeb.torus.getPublicAddress(
        nodeDetails.torusNodeEndpoints,
        nodeDetails.torusNodePub,
        {
          verifier: this.tssVerifier,
          verifierId: `${this.verifierId}\u0015${tssTag || "default"}\u0016${tssNonce || 0}`,
        },
        true
      )) as TorusPublicKey;

      return new Point(tssServerPub.X, tssServerPub.Y);
    }
    if (this.verifierType === "aggregate") {
      const nodeDetails = await this.directWeb.nodeDetailManager.getNodeDetails({ verifier: this.tssVerifier, verifierId: this.verifierId });
      const tssServerPub = (await this.directWeb.torus.getPublicAddress(
        nodeDetails.torusNodeEndpoints,
        nodeDetails.torusNodePub,
        {
          verifier: this.tssVerifier,
          verifierId: `${this.verifierId}\u0015${tssTag || "default"}\u0016${tssNonce || 0}`,
        },
        true
      )) as TorusPublicKey;

      return new Point(tssServerPub.X, tssServerPub.Y);
    }
    if (this.verifierType === "hybrid") {
      const nodeDetails = await this.directWeb.nodeDetailManager.getNodeDetails({ verifier: this.tssVerifier, verifierId: this.verifierId });
      const tssServerPub = (await this.directWeb.torus.getPublicAddress(
        nodeDetails.torusNodeEndpoints,
        nodeDetails.torusNodePub,
        {
          verifier: this.tssVerifier,
          verifierId: `${this.verifierId}\u0015${tssTag || "default"}\u0016${tssNonce || 0}`,
        },
        true
      )) as TorusPublicKey;

      return new Point(tssServerPub.X, tssServerPub.Y);
    }
  }

  async triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse> {
    const obj = await this.directWeb.triggerLogin(params);
    this.postboxKey = new BN(obj.privateKey, "hex");
    const { verifier, verifierId } = obj.userInfo;
    this.verifierName = verifier;
    this.verifierId = verifierId;
    this.verifierType = "normal";
    return obj;
  }

  async triggerAggregateLogin(params: AggregateLoginParams): Promise<TorusAggregateLoginResponse> {
    const obj = await this.directWeb.triggerAggregateLogin(params);
    this.postboxKey = new BN(obj.privateKey, "hex");
    const { verifier, verifierId } = obj.userInfo[0];
    this.verifierName = verifier;
    this.verifierId = verifierId;
    this.verifierType = "aggregate";
    return obj;
  }

  async triggerHybridAggregateLogin(params: HybridAggregateLoginParams): Promise<TorusHybridAggregateLoginResponse> {
    const obj = await this.directWeb.triggerHybridAggregateLogin(params);
    const aggregateLoginKey = obj.aggregateLogins[0].privateKey;
    this.postboxKey = new BN(aggregateLoginKey, "hex");
    this.singleLoginKey = new BN(obj.singleLogin.privateKey, "hex");
    const { verifier, verifierId } = obj.singleLogin.userInfo;
    this.verifierName = verifier;
    this.verifierId = verifierId;
    this.verifierType = "hybrid";
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
