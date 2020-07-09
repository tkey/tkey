import { post } from "@toruslabs/http-helpers";
import BN from "bn.js";
import { curve } from "elliptic";
import { keccak256 } from "web3-utils";

import { getPubKeyECC, getPubKeyPoint, toPrivKeyEC, toPrivKeyECC } from "./base/BNUtils";
import { IServiceProvider, IStorageLayer, TorusStorageLayerAPIParams, TorusStorageLayerArgs } from "./base/commonTypes";
import { decrypt, encrypt } from "./utils";

class TorusStorageLayer implements IStorageLayer {
  enableLogging: boolean;

  hostUrl: string;

  serviceProvider: IServiceProvider;

  constructor({ enableLogging = false, hostUrl = "http://localhost:5051", serviceProvider }: TorusStorageLayerArgs) {
    this.enableLogging = enableLogging;
    this.hostUrl = hostUrl;
    this.serviceProvider = serviceProvider;
  }

  async getMetadata<T>(privKey?: BN): Promise<T> {
    const keyDetails = this.generateMetadataParams({}, privKey);
    const metadataResponse = await post<{ message: string }>(`${this.hostUrl}/get`, keyDetails);
    // returns empty object if objec
    if (metadataResponse.message === "") {
      return {} as T;
    }
    const encryptedMessage = JSON.parse(atob(metadataResponse.message));

    let decrypted;
    if (privKey) {
      decrypted = await decrypt(toPrivKeyECC(privKey), encryptedMessage);
    } else {
      decrypted = await this.serviceProvider.decrypt(encryptedMessage);
    }

    return JSON.parse(decrypted) as T;
  }

  async setMetadata<T>(input: T, privKey?: BN): Promise<{ message: string }> {
    const bufferMetadata = Buffer.from(JSON.stringify(input));
    let encryptedDetails;
    if (privKey) {
      encryptedDetails = await encrypt(getPubKeyECC(privKey), bufferMetadata);
    } else {
      encryptedDetails = await this.serviceProvider.encrypt(this.serviceProvider.retrievePubKey("ecc") as Buffer, bufferMetadata);
    }
    const serializedEncryptedDetails = btoa(JSON.stringify(encryptedDetails));
    const p = this.generateMetadataParams(serializedEncryptedDetails, privKey);
    return post<{ message: string }>(`${this.hostUrl}/set`, p);
  }

  generateMetadataParams(message: unknown, privKey: BN): TorusStorageLayerAPIParams {
    let sig;
    let pubX;
    let pubY;
    const setData = {
      data: message,
      timestamp: new BN(Date.now()).toString(16),
    };
    const hash = keccak256(JSON.stringify(setData)).slice(2);
    if (privKey) {
      const unparsedSig = toPrivKeyEC(privKey).sign(hash);
      sig = Buffer.from(unparsedSig.r.toString(16, 64) + unparsedSig.s.toString(16, 64) + new BN(0).toString(16, 2), "hex").toString("base64");
      const pubK = getPubKeyPoint(privKey);
      pubX = pubK.x.toString("hex");
      pubY = pubK.y.toString("hex");
    } else {
      sig = this.serviceProvider.sign(hash);
      pubX = (this.serviceProvider.retrievePubKey() as curve.base.BasePoint).getX().toString("hex");
      pubY = (this.serviceProvider.retrievePubKey() as curve.base.BasePoint).getY().toString("hex");
    }
    return {
      pub_key_X: pubX,
      pub_key_Y: pubY,
      set_data: setData,
      signature: sig,
    };
  }
}

export default TorusStorageLayer;
