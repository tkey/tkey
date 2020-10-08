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

export function entropyToMnemonic(entropy: Buffer | string, english: string[]): string {
  let newEntropy: Buffer;
  if (!Buffer.isBuffer(entropy)) {
    newEntropy = Buffer.from(entropy, "hex");
  }

  // 128 <= ENT <= 256
  if (newEntropy.length < 16) {
    throw new TypeError("Invalid Entropy");
  }
  if (newEntropy.length > 32) {
    throw new TypeError("Invalid Entropy");
  }
  if (newEntropy.length % 4 !== 0) {
    throw new TypeError("Invalid Entropy");
  }

  const entropyBits = bytesToBinary(Array.from(newEntropy));
  const checksumBits = deriveChecksumBits(newEntropy);

  const bits = entropyBits + checksumBits;
  const chunks = bits.match(/(.{1,11})/g)!;
  const words = chunks.map((binary: string): string => {
    const index = binaryToByte(binary);
    return english![index];
  });

  return english[0] === "\u3042\u3044\u3053\u304f\u3057\u3093" // Japanese wordlist
    ? words.join("\u3000")
    : words.join(" ");
}

export function mnemonicToEntropy(mnemonic: string, english: string[]): string {
  const words = normalize(mnemonic).split(" ");
  if (words.length % 3 !== 0) {
    throw new Error("Invalid mnemonic");
  }

  // convert word indices to 11 bit binary strings
  const bits = words
    .map((word: string): string => {
      const index = english!.indexOf(word);
      if (index === -1) {
        throw new Error("Invalid mnemonic");
      }

      return lpad(index.toString(2), "0", 11);
    })
    .join("");

  // split the binary string into ENT/CS
  const dividerIndex = Math.floor(bits.length / 33) * 32;
  const entropyBits = bits.slice(0, dividerIndex);
  const checksumBits = bits.slice(dividerIndex);

  // calculate the checksum and compare
  const entropyBytes = entropyBits.match(/(.{1,8})/g)!.map(binaryToByte);
  if (entropyBytes.length < 16) {
    throw new Error("Invalid Entropy");
  }
  if (entropyBytes.length > 32) {
    throw new Error("Invalid Entropy");
  }
  if (entropyBytes.length % 4 !== 0) {
    throw new Error("Invalid Entropy");
  }

  const entropy = Buffer.from(entropyBytes);
  const newChecksum = deriveChecksumBits(entropy);
  if (newChecksum !== checksumBits) {
    throw new Error("Invalid Checksum");
  }

  return entropy.toString("hex");
}
