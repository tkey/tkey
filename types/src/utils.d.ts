/// <reference types="node" />
import { ec as EC } from "elliptic";
import { EncryptedMessage } from "./baseTypes/commonTypes";
export declare const ecCurve: EC;
export declare function encrypt(publicKey: Buffer, msg: Buffer): Promise<EncryptedMessage>;
export declare function decrypt(privKey: Buffer, msg: EncryptedMessage): Promise<Buffer>;
export declare function isEmptyObject(obj: unknown): boolean;
export declare const isErrorObj: (err: Error) => boolean;
export declare function prettyPrintError(error: Error): string;
export declare function generateAddressFromPublicKey(publicKey: Buffer): string;
export declare function normalize(input: number | string): string;
export declare const KEY_NOT_FOUND = "KEY_NOT_FOUND";
