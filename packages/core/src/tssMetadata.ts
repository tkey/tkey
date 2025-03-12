import { EncryptedMessage, FactorEnc, FactorEncType, ISerializable, ITssMetadata, KeyType, Point, StringifiedType } from "@tkey/common-types";

export const FromJsonEncryptedMessage = (value: StringifiedType): EncryptedMessage => {
  const { ciphertext, ephemPublicKey, iv, mac } = value;
  if (typeof ciphertext !== "string") throw new Error("ciphertext is not a string");
  if (typeof ephemPublicKey !== "string") throw new Error("ephemPublicKey is not a string");
  if (typeof iv !== "string") throw new Error("iv is not a string");
  if (typeof mac !== "string") throw new Error("mac is not a string");

  return {
    ciphertext,
    ephemPublicKey,
    iv,
    mac,
  };
};

export const FromJsonFactorEnc = (value: StringifiedType): FactorEnc => {
  const { tssIndex, type, userEnc, serverEncs } = value;
  if (typeof tssIndex !== "number") throw new Error("tssIndex is not a number");
  if (typeof type !== "string") throw new Error("type is not a string");
  if (typeof userEnc !== "object") throw new Error("userEnc is not a string");
  if (!Array.isArray(serverEncs)) throw new Error("serverEncs is not an array");

  return { type: type as FactorEncType, tssIndex, userEnc: FromJsonEncryptedMessage(userEnc), serverEncs: serverEncs.map(FromJsonEncryptedMessage) };
};

export class TssMetadata implements ITssMetadata, ISerializable {
  tssTag: string;

  tssKeyType: KeyType;

  tssNonce: number;

  tssPolyCommits: Point[];

  factorPubs: Point[];

  factorEncs: {
    [factorPubID: string]: FactorEnc;
  };

  constructor(params: ITssMetadata) {
    this.tssTag = params.tssTag;
    this.tssKeyType = params.tssKeyType;
    this.tssNonce = params.tssNonce;
    this.tssPolyCommits = params.tssPolyCommits;
    this.factorPubs = params.factorPubs;
    this.factorEncs = params.factorEncs;
  }

  static fromJSON(value: StringifiedType): TssMetadata {
    const { tssTag, tssKeyType, tssPolyCommits, tssNonce, factorPubs, factorEncs } = value;

    if (typeof tssTag !== "string") throw new Error("tssTag is not a string");
    if (typeof tssNonce !== "number") throw new Error("tssNonce is not a number");
    if (typeof factorEncs !== "object") throw new Error("factorEncs is not an object");

    if (!(tssKeyType in KeyType)) {
      throw new Error("tssKeyType is not a valid KeyType");
    }

    if (!Array.isArray(tssPolyCommits)) {
      throw new Error("tssPolyCommits is not an array");
    }

    if (!Array.isArray(factorPubs)) {
      throw new Error("factorPubs is not an array");
    }

    for (const key in factorEncs) {
      const factorEnc = factorEncs[key];
      factorEncs[key] = FromJsonFactorEnc(factorEnc);
    }

    const tssMetadata = new TssMetadata({
      tssTag,
      tssKeyType,
      tssNonce,
      tssPolyCommits: (tssPolyCommits as Point[]).map((obj) => Point.fromJSON(obj)),
      factorPubs: (factorPubs as Point[]).map((obj) => Point.fromJSON(obj)),
      factorEncs,
    });

    return tssMetadata;
  }

  toJSON(): StringifiedType {
    return {
      tssTag: this.tssTag,
      tssKeyType: this.tssKeyType,
      tssNonce: this.tssNonce,
      tssPolyCommits: this.tssPolyCommits.map((pub) => pub.toJSON()),
      factorPubs: this.factorPubs.map((pub) => pub.toJSON()),
      factorEncs: this.factorEncs,
    };
  }

  update(tssData: {
    tssTag: string;
    tssKeyType?: KeyType;
    tssNonce?: number;
    tssPolyCommits?: Point[];
    factorPubs?: Point[];
    factorEncs?: {
      [factorPubID: string]: FactorEnc;
    };
  }) {
    const { tssKeyType, tssTag, tssNonce, tssPolyCommits, factorPubs, factorEncs } = tssData;
    if (tssTag) this.tssTag = tssTag;
    if (tssKeyType) this.tssKeyType = tssKeyType;
    if (tssNonce !== undefined) this.tssNonce = tssNonce;
    if (tssPolyCommits) this.tssPolyCommits = tssPolyCommits;
    if (factorPubs) this.factorPubs = factorPubs;
    if (factorEncs) this.factorEncs = factorEncs;
  }
}
