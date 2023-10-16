/* eslint-disable */
import {
  encrypt,
  decrypt,
  EncryptedMessage,
  getPubKeyECC,
  IMessageMetadata,
  InitializeNewKeyResult,
  IServiceProvider,
  IStorageLayer,
  KEY_NOT_FOUND,
  prettyPrintError,
  StringifiedType,
  toPrivKeyECC,
} from "@oraichain/common-types";
import { generatePrivate } from "@toruslabs/eccrypto";
import BN from "bn.js";
import CoreError from "./errors";

export type OnlySocialKeyArgs = {
  storageLayer: IStorageLayer;
  serviceProvider: IServiceProvider;
};

export type KeyDetails = {
  pubKey: string;
};

class OnlySocialKey {
  privKey: BN;
  serviceProvider: IServiceProvider;
  storageLayer: IStorageLayer;

  constructor(args: OnlySocialKeyArgs) {
    const { serviceProvider, storageLayer } = args || {};
    this.serviceProvider = serviceProvider;
    this.storageLayer = storageLayer;
  }

  async initialize(params?: { importKey?: BN; neverInitializeNewKey?: boolean; initializeNewKey?: boolean }): Promise<KeyDetails> {
    const { importKey, neverInitializeNewKey, initializeNewKey } = params || {};
    const rawServiceProviderShare = await this.getGenericMetadata();
    console.log({ rawServiceProviderShare });
    const noKeyFound: { message?: string } = rawServiceProviderShare as { message?: string };
    if (noKeyFound.message === KEY_NOT_FOUND || initializeNewKey) {
      if (neverInitializeNewKey) {
        throw CoreError.default("key has not been generated yet");
      }
      // no metadata set, assumes new user
      await this._initializeNewKey({ importedKey: importKey });
      return this.getKeyDetails();
    }
    this._setKey(rawServiceProviderShare as BN);

    return this.getKeyDetails();
  }

  async _initializeNewKey(params: { importedKey?: BN }): Promise<InitializeNewKeyResult> {
    const { importedKey } = params || {};
    if (importedKey) {
      this._setKey(importedKey);
    } else {
      this._setKey(new BN(generatePrivate()));
    }
    try {
      await this.storageLayer.setMetadata({ input: this.privKey, serviceProvider: this.serviceProvider });
    } catch (err) {
      throw CoreError.authMetadataSetUnavailable(`${prettyPrintError(err)}`);
    }

    return {
      privKey: this.privKey,
    };
  }

  _setKey(privKey: BN): void {
    this.privKey = privKey;
  }
  getKeyDetails(): KeyDetails {
    return {
      pubKey: getPubKeyECC(this.privKey).toString("hex"),
    };
  }

  async getGenericMetadata(): Promise<unknown> {
    const fromJSONConstructor = {
      fromJSON(val: StringifiedType) {
        return val;
      },
    };
    if (!this.storageLayer && !this.serviceProvider) {
      throw new CoreError(1000, "Not found storageLayer and serviceProvider");
    }
    let raw: IMessageMetadata;
    try {
      raw = await this.storageLayer.getMetadata({ serviceProvider: this.serviceProvider });
    } catch (err) {
      throw CoreError.metadataGetFailed(`${prettyPrintError(err)}`);
    }
    return fromJSONConstructor.fromJSON(raw);
  }
  getStorageLayer(): IStorageLayer {
    return this.storageLayer;
  }

  encrypt(data: Buffer): Promise<EncryptedMessage> {
    if (!this.privKey) throw CoreError.privateKeyUnavailable();
    return encrypt(getPubKeyECC(this.privKey), data);
  }

  decrypt(encryptedMessage: EncryptedMessage): Promise<Buffer> {
    if (!this.privKey) throw CoreError.privateKeyUnavailable();
    return decrypt(toPrivKeyECC(this.privKey), encryptedMessage);
  }

  toJSON(): StringifiedType {
    throw new Error("Method not implemented.");
  }
}

export default OnlySocialKey;
