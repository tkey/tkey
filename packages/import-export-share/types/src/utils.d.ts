/// <reference types="node" />
export declare function normalize(str?: string): string;
export declare function binaryToByte(bin: string): number;
export declare function lpad(str: string, padString: string, length: number): string;
export declare function bytesToBinary(bytes: number[]): string;
export declare function deriveChecksumBits(entropyBuffer: Buffer): string;
