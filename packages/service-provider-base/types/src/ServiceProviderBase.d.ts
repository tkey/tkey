/// <reference types="node" />
import { BNString, EncryptedMessage, IServiceProvider, PubKeyType, ServiceProviderArgs, StringifiedType } from "@tkey/common-types";
import BN from "bn.js";
import { curve } from "elliptic";
declare class ServiceProviderBase implements IServiceProvider {
    enableLogging: boolean;
    postboxKey: BN;
    serviceProviderName: string;
    constructor({ enableLogging, postboxKey }: ServiceProviderArgs);
    encrypt(msg: Buffer): Promise<EncryptedMessage>;
    decrypt(msg: EncryptedMessage): Promise<Buffer>;
    retrievePubKeyPoint(): curve.base.BasePoint;
    retrievePubKey(type: PubKeyType): Buffer;
    sign(msg: BNString): string;
    toJSON(): StringifiedType;
    static fromJSON(value: StringifiedType): IServiceProvider;
}
export default ServiceProviderBase;
