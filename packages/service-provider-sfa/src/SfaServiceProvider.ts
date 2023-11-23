import { type StringifiedType } from "@tkey/common-types";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import Torus, { keccak256, TorusKey } from "@toruslabs/torus.js";
import BN from "bn.js";

import { AggregateVerifierParams, LoginParams, SfaServiceProviderArgs, Web3AuthOptions } from "./interfaces";

class SfaServiceProvider extends ServiceProviderBase {
  web3AuthOptions: Web3AuthOptions;

  authInstance: Torus;

  public torusKey: TorusKey;

  private nodeDetailManagerInstance: NodeDetailManager;

  constructor({ enableLogging = false, postboxKey, web3AuthOptions }: SfaServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.web3AuthOptions = web3AuthOptions;
    this.authInstance = new Torus({
      clientId: web3AuthOptions.clientId,
      enableOneKey: true,
      network: web3AuthOptions.network,
    });
    Torus.enableLogging(enableLogging);
    this.serviceProviderName = "SfaServiceProvider";
    this.nodeDetailManagerInstance = new NodeDetailManager({ network: web3AuthOptions.network, enableLogging });
  }

  static fromJSON(value: StringifiedType): SfaServiceProvider {
    const { enableLogging, postboxKey, web3AuthOptions, serviceProviderName, torusKey } = value;
    if (serviceProviderName !== "SfaServiceProvider") return undefined;

    const sfaSP = new SfaServiceProvider({
      enableLogging,
      postboxKey,
      web3AuthOptions,
    });

    sfaSP.torusKey = torusKey;

    return sfaSP;
  }

  async connect(params: LoginParams): Promise<BN> {
    const { verifier, verifierId, idToken, subVerifierInfoArray } = params;
    const verifierDetails = { verifier, verifierId };

    // fetch node details.
    const { torusNodeEndpoints, torusNodePub, torusIndexes } = await this.nodeDetailManagerInstance.getNodeDetails(verifierDetails);

    if (params.serverTimeOffset) {
      this.authInstance.serverTimeOffset = params.serverTimeOffset;
    }
    // Does the key assign
    if (this.authInstance.isLegacyNetwork) await this.authInstance.getPublicAddress(torusNodeEndpoints, torusNodePub, { verifier, verifierId });

    let finalIdToken = idToken;
    let finalVerifierParams = { verifier_id: verifierId };
    if (subVerifierInfoArray && subVerifierInfoArray?.length > 0) {
      const aggregateVerifierParams: AggregateVerifierParams = { verify_params: [], sub_verifier_ids: [], verifier_id: "" };
      const aggregateIdTokenSeeds = [];
      for (let index = 0; index < subVerifierInfoArray.length; index += 1) {
        const userInfo = subVerifierInfoArray[index];
        aggregateVerifierParams.verify_params.push({ verifier_id: verifierId, idtoken: userInfo.idToken });
        aggregateVerifierParams.sub_verifier_ids.push(userInfo.verifier);
        aggregateIdTokenSeeds.push(userInfo.idToken);
      }
      aggregateIdTokenSeeds.sort();

      finalIdToken = keccak256(Buffer.from(aggregateIdTokenSeeds.join(String.fromCharCode(29)), "utf8")).slice(2);

      aggregateVerifierParams.verifier_id = verifierId;
      finalVerifierParams = aggregateVerifierParams;
    }

    const torusKey = await this.authInstance.retrieveShares(torusNodeEndpoints, torusIndexes, verifier, finalVerifierParams, finalIdToken);
    this.torusKey = torusKey;
    const postboxKey = Torus.getPostboxKey(torusKey);
    this.postboxKey = new BN(postboxKey, 16);
    return this.postboxKey;
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
