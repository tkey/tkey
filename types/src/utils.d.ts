/// <reference types="node" />
import { ec as EC } from "elliptic";
import { EncryptedMessage } from "./baseTypes/commonTypes";
declare const ecCurve: EC;
declare function encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage>;
declare function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<Buffer>;
declare function isEmptyObject(obj: unknown): boolean;
export declare const isErrorObj: (err: Error) => boolean;
declare function prettyPrintError(error: Error): string;
export { isEmptyObject, encrypt, decrypt, ecCurve, prettyPrintError, };
