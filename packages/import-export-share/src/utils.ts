import createHash from "create-hash";

export function normalize(str?: string): string {
  return (str || "").normalize("NFKD");
}

export function binaryToByte(bin: string): number {
  return parseInt(bin, 2);
}

export function lpad(str: string, padString: string, length: number): string {
  let string = str;
  while (string.length < length) {
    string = padString + string;
  }
  return string;
}

export function bytesToBinary(bytes: number[]): string {
  return bytes.map((x) => lpad(x.toString(2), "0", 8)).join("");
}

export function deriveChecksumBits(entropyBuffer: Buffer): string {
  const ENT = entropyBuffer.length * 8;
  const CS = ENT / 32;
  const hash = createHash("sha256").update(entropyBuffer).digest();

  return bytesToBinary(Array.from(hash)).slice(0, CS);
}
