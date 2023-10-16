import { IBlsdkgSignable, StringifiedType, TorusServiceProviderArgs } from "@oraichain/common-types";
import CustomAuth, {
  CustomAuthArgs,
  InitParams,
  MapNewVerifierParams,
  SubVerifierDetails,
  TorusLoginResponse,
  TorusVerifierResponse,
} from "@oraichain/customauth";
import { ServiceProviderBase } from "@oraichain/service-provider-base";
import BN from "bn.js";
import { keccak256 } from "web3-utils";

class TorusServiceProvider extends ServiceProviderBase {
  directWeb: CustomAuth;

  singleLoginKey: BN;

  customAuthArgs: CustomAuthArgs;

  blsDkgPackage?: IBlsdkgSignable;

  currentUser?: { verifier: string; verifierId: string };

  constructor({ enableLogging = false, postboxKey, customAuthArgs, blsDkgPackage }: TorusServiceProviderArgs) {
    super({ enableLogging, postboxKey });
    this.customAuthArgs = customAuthArgs;
    this.directWeb = new CustomAuth(customAuthArgs);
    this.serviceProviderName = "TorusServiceProvider";
    this.blsDkgPackage = blsDkgPackage;
  }

  static fromJSON(value: StringifiedType): TorusServiceProvider {
    const { enableLogging, postboxKey, customAuthArgs, serviceProviderName, blsDkgPackage, currentUser } = value;
    if (serviceProviderName !== "TorusServiceProvider") return undefined;

    const torusProvider = new TorusServiceProvider({
      enableLogging,
      postboxKey,
      customAuthArgs,
      blsDkgPackage,
    });
    torusProvider.setCurrentUser(currentUser.verifier, currentUser.verifierId);
    return torusProvider;
  }

  signByBlsdkg(message: string): string {
    if (!this.blsDkgPackage) throw new Error("blsDkgPackage is not set");
    if (!this.postboxKey) {
      throw new Error("postboxKey is not set");
    }
    const msgToBuffer = Buffer.from(message.replace("0x", ""), "hex");
    return Buffer.from(this.blsDkgPackage.sign(this.postboxKey.toArrayLike(Buffer, "be", 32), msgToBuffer)).toString("base64");
  }

  mapNewVerifierId(mapNewVerifierIdParams: MapNewVerifierParams) {
    if (!(this.currentUser.verifier && this.currentUser.verifierId)) {
      throw new Error("Current user is not set");
    }
    const msg = `${this.currentUser.verifier}${keccak256(this.currentUser.verifierId)}${mapNewVerifierIdParams.newVerifier}${keccak256(
      mapNewVerifierIdParams.newVerifierId
    )}`;

    const hash = keccak256(msg);

    const signature = this.signByBlsdkg(hash);

    return this.directWeb.mapNewVerifierId({
      ...mapNewVerifierIdParams,
      verifier: this.currentUser.verifier,
      verifierId: this.currentUser.verifierId,
      signature,
    });
  }

  async init(params?: InitParams): Promise<void> {
    return this.directWeb.init(params);
  }

  async triggerLogin(params: SubVerifierDetails): Promise<TorusLoginResponse> {
    const obj = await this.directWeb.triggerLogin(params);
    this.setPostboxKey(new BN(obj.privateKey, "hex"));
    this.setCurrentUser(params.verifier, obj.userInfo.verifierId);
    return obj;
  }

  async triggerLoginMobile(params: SubVerifierDetails): Promise<{
    sharesIndexes: Buffer[];
    shares: Buffer[];
    userInfo?: TorusVerifierResponse;
  }> {
    const obj = await this.directWeb.triggerLoginMobile(params);
    this.setCurrentUser(params.verifier, obj.userInfo.verifierId);
    return obj;
  }

  setPostboxKey(key: BN) {
    this.postboxKey = key;
  }

  setCurrentUser(verifier: string, verifierId: string) {
    this.currentUser = { verifier, verifierId };
  }

  toJSON(): StringifiedType {
    return {
      ...super.toJSON(),
      serviceProviderName: this.serviceProviderName,
      customAuthArgs: this.customAuthArgs,
      curentUser: this.currentUser,
    };
  }
}
export default TorusServiceProvider;
