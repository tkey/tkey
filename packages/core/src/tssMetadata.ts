import { FactorEnc, ISerializable, ITssMetadata, KeyType, Point, StringifiedType } from "@tkey/common-types";

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

    const tssMetadata = new TssMetadata({
      tssTag,
      tssKeyType,
      tssNonce,
      tssPolyCommits,
      factorEncs,
      factorPubs,
    });

    if (tssPolyCommits) {
      tssMetadata.tssPolyCommits = (tssPolyCommits as Point[]).map((obj) => new Point(obj.x, obj.y));
    }
    if (factorPubs) {
      tssMetadata.factorPubs = (factorPubs as Point[]).map((obj) => new Point(obj.x, obj.y));
    }

    if (factorEncs) tssMetadata.factorEncs = factorEncs;

    return tssMetadata;
  }

  toJSON(): StringifiedType {
    return {
      tssTag: this.tssTag,
      tssKeyType: this.tssKeyType,
      tssNonce: this.tssNonce,
      tssPolyCommits: this.tssPolyCommits,
      factorPubs: this.factorPubs,
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
