/// <reference types="node" />
import BN from "bn.js";
import { curve, ec as EC } from "elliptic";
import { BNString, EncryptedMessage, IServiceProvider, ServiceProviderArgs } from "../base/commonTypes";
declare class ServiceProviderBase implements IServiceProvider {
    ec: EC;
    enableLogging: boolean;
    postboxKey: BN;
    constructor({ enableLogging, postboxKey }?: ServiceProviderArgs);
    encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage>;
    decrypt(msg: EncryptedMessage): Promise<Buffer>;
    retrievePubKey(type: "ecc"): Buffer | curve.base.BasePoint;
    sign(msg: BNString): string;
}
export default ServiceProviderBase;
