import { KeyType, ONE_KEY_DELETE_NONCE, StringifiedType, TorusServiceProviderArgs } from "@tkey/common-types";
import { ServiceProviderBase } from "@tkey/service-provider-base";
import { TorusStorageLayer } from "@tkey/storage-layer-torus";
import {
  AggregateLoginParams,
  CustomAuth,
  CustomAuthArgs,
  InitParams,
  SubVerifierDetails,
  TorusAggregateLoginResponse,
  TorusLoginResponse,
} from "@toruslabs/customauth";
import { fetchLocalConfig } from "@toruslabs/fnd-base";
import { Torus, TorusKey } from "@toruslabs/torus.js";
import BN from "bn.js";

class TorusServiceProvider extends ServiceProviderBase {
  customAuthInstance: CustomAuth;

  singleLoginKey: BN;

  public torusKey: TorusKey;

  public migratableKey: BN | null = null; // Migration of key from SFA to tKey

  customAuthArgs: CustomAuthArgs;

  private metadataUrl?: string;

  private root = false;

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
    this.metadataUrl = fetchLocalConfig(this.customAuthArgs.network, this.customAuthArgs.keyType)?.torusNodeEndpoints[0].replace(
      "/sss/jrpc",
      "/metadata"
    );
    return this.customAuthInstance.init(params);
  }

  getMetadataUrl(): string {
    return this.metadataUrl;
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

        // TODO : handle for ed25519 key
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

      if (!this.migratableKey) {
        this.root = false;
        return;
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

  getKeyType(): KeyType {
    return KeyType[this.customAuthArgs.keyType];
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
