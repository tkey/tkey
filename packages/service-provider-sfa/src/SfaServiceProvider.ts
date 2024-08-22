import { ONE_KEY_DELETE_NONCE, type StringifiedType } from "@tkey/common-types";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import { TorusStorageLayer } from "@tkey/storage-layer-torus";
import { NodeDetailManager } from "@toruslabs/fetch-node-details";
import { keccak256, Torus, TorusKey } from "@toruslabs/torus.js";
import BN from "bn.js";

import { AggregateVerifierParams, LoginParams, SfaServiceProviderArgs, Web3AuthOptions } from "./interfaces";
class SfaServiceProvider extends ServiceProviderBase {
  web3AuthOptions: Web3AuthOptions;

  authInstance: Torus;

  public torusKey: TorusKey;

  public migratableKey: BN | null = null;

  private root: boolean;

  private nodeDetailManagerInstance: NodeDetailManager;

  private metadataUrl?: string;

  private verifierDetails: {
    verifier: string;
    verifierId: string;
  };

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
    this.verifierDetails = { verifier, verifierId };

    // fetch node details.
    const { torusNodeEndpoints, torusIndexes, torusNodePub } = await this.nodeDetailManagerInstance.getNodeDetails(this.verifierDetails);

    this.metadataUrl = await this.nodeDetailManagerInstance.getMetadataUrl();

    if (params.serverTimeOffset) {
      this.authInstance.serverTimeOffset = params.serverTimeOffset;
    }

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

    const torusKey = await this.authInstance.retrieveShares({
      endpoints: torusNodeEndpoints,
      indexes: torusIndexes,
      verifier,
      verifierParams: finalVerifierParams,
      idToken: finalIdToken,
      nodePubkeys: torusNodePub,
      useDkg: this.web3AuthOptions.useDkg,
    });
    this.torusKey = torusKey;

    if (!torusKey.metadata.upgraded) {
      const { finalKeyData, oAuthKeyData } = torusKey;
      const privKey = finalKeyData.privKey || oAuthKeyData.privKey;
      this.migratableKey = new BN(privKey, "hex");
    }
    const postboxKey = Torus.getPostboxKey(torusKey);
    this.postboxKey = new BN(postboxKey, 16);
    return this.postboxKey;
  }

  getMetadataUrl(): string {
    return this.metadataUrl || "";
  }

  // enabling root access will allow developer to call critical function
  enableRootAccess() {
    this.root = true;
  }

  // Critical function
  // This function will delete sfa key and replaced with postboxkey
  // only callable after enable root access and will reset the root access at the end of function.
  async delete1of1Key(enableLogging?: boolean) {
    try {
      if (!this.root) {
        throw new Error("Cannot delete 1of1 key without root flag");
      }
      if (!this.metadataUrl) {
        throw new Error("Please connect first");
      }

      // setup TorusStorageLayer using the endpoint
      const storageLayer = new TorusStorageLayer({
        hostUrl: this.metadataUrl,
        enableLogging: enableLogging || false,
      });
      // await storageLayer.setMetadata({ input: { message: ONE_KEY_DELETE_NONCE }, privKey: this.postboxKey });
      await storageLayer.setMetadataStream({ input: [{ message: ONE_KEY_DELETE_NONCE }], privKey: [this.postboxKey] });

      // set migratableKey to null after successful delete nonce
      this.migratableKey = null;
    } finally {
      this.root = false;
    }
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
