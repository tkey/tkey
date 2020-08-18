/// <reference types="node" />
import { ec as EC } from "elliptic";
import { EncryptedMessage } from "./baseTypes/commonTypes";
declare const ecCurve: EC;
declare function encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage>;
declare function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<Buffer>;
declare function isEmptyObject(obj: unknown): boolean;
export { isEmptyObject, encrypt, decrypt, ecCurve, };
