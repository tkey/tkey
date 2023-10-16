import { decrypt, generatePrivate, getPublic } from "@toruslabs/eccrypto";
import { Data, generateJsonRPCObject, post, setEmbedHost } from "@toruslabs/http-helpers";
import BN from "bn.js";
import { ec as EC } from "elliptic";
import stringify from "json-stable-stringify";

import {
  CommitmentRequestResult,
  GetOrSetNonceResult,
  JRPCResponse,
  KeyAssignment,
  MetadataParams,
  RetrieveSharesResponse,
  SetCustomKeyOptions,
  TorusCtorOptions,
  VerifierParams,
} from "./interfaces";
import log from "./loglevel";
import { Some } from "./some";
import { GetOrSetNonceError, keccak256, thresholdSame } from "./utils";

// Implement threshold logic wrappers around public APIs
// of Torus nodes to handle malicious node responses
class Torus {
  public metadataHost: string;

  public serverTimeOffset: number;

  public enableOneKey: boolean;

  public network: string;

  protected ec: EC;

  public blsdkg: {
    init: any;
    interpolate: (indexes: Uint8Array[], shares: Uint8Array[]) => Uint8Array;
    get_pk: (privKey: Uint8Array) => Uint8Array;
  };

  constructor({
    enableOneKey = false,
    metadataHost = "https://metadata.social-login.orai.io",
    serverTimeOffset = 0,
    network = "mainnet",
    blsdkg,
  }: TorusCtorOptions = {}) {
    this.ec = new EC("secp256k1");
    this.metadataHost = metadataHost;
    this.enableOneKey = enableOneKey;
    this.serverTimeOffset = serverTimeOffset || 0; // ms
    this.network = network;
    this.blsdkg = blsdkg;
  }

  static enableLogging(v = true): void {
    if (v) log.enableAll();
    else log.disableAll();
  }

  static setEmbedHost(embedHost: string): void {
    setEmbedHost(embedHost);
  }

  static isGetOrSetNonceError(err: unknown): boolean {
    return err instanceof GetOrSetNonceError;
  }

  async setCustomKey({ privKeyHex, metadataNonce, torusKeyHex, customKeyHex }: SetCustomKeyOptions): Promise<void> {
    let torusKey: BN;
    if (torusKeyHex) {
      torusKey = new BN(torusKeyHex, 16);
    } else {
      const privKey = new BN(privKeyHex as string, 16);
      torusKey = privKey.sub(metadataNonce as BN).umod(this.ec.curve.n);
    }
    const customKey = new BN(customKeyHex, 16);
    const newMetadataNonce = customKey.sub(torusKey).umod(this.ec.curve.n);
    const data = this.generateMetadataParams(newMetadataNonce.toString(16), torusKey);
    await this.setMetadata(data);
  }

  async retrieveShares(
    typeOfLogin: string,
    endpoints: string[],
    indexes: number[],
    verifierParams: VerifierParams,
    idToken: string,
    extraParams: Record<string, unknown> = {}
  ): Promise<RetrieveSharesResponse> {
    const promiseArr = [];
    // generate temporary private and public key that is used to secure receive shares
    const tmpKey = generatePrivate();
    const pubKey = getPublic(tmpKey).toString("hex");
    const pubKeyX = pubKey.slice(2, 66);
    const pubKeyY = pubKey.slice(66);
    const tokenCommitment = keccak256(idToken);

    // make commitment requests to endpoints
    for (let i = 0; i < endpoints.length; i += 1) {
      const p = post<JRPCResponse<CommitmentRequestResult>>(
        endpoints[i],
        generateJsonRPCObject("CommitmentRequest", {
          tokencommitment: tokenCommitment.slice(2),
          temppubx: pubKeyX,
          temppuby: pubKeyY,
        })
      ).catch((err) => {
        log.error("commitment", err);
      });
      promiseArr.push(p);
    }
    // send share request once k + t number of commitment requests have completed
    return Some<void | JRPCResponse<CommitmentRequestResult>, (void | JRPCResponse<CommitmentRequestResult>)[]>(promiseArr, (resultArr) => {
      const completedRequests = resultArr.filter((x) => {
        if (!x || typeof x !== "object") {
          return false;
        }
        if (x.error) {
          return false;
        }
        return true;
      });
      if (completedRequests.length >= ~~(endpoints.length / 2) + 1) {
        return Promise.resolve(completedRequests);
      }
      return Promise.reject(new Error(`invalid ${JSON.stringify(resultArr)}`));
    })
      .then((responses) => {
        const promiseArrRequest: Promise<void | JRPCResponse<KeyAssignment>>[] = [];
        const nodeSigs = [];
        for (let i = 0; i < responses.length; i += 1) {
          if (responses[i]) nodeSigs.push((responses[i] as JRPCResponse<CommitmentRequestResult>).result);
        }
        for (let i = 0; i < endpoints.length; i += 1) {
          const p = post<JRPCResponse<KeyAssignment>>(
            endpoints[i],
            generateJsonRPCObject("ShareRequest", { typeOfLogin, ...verifierParams, idtoken: idToken, nodesignatures: nodeSigs, ...extraParams })
          ).catch((err) => log.error("share req", err));
          promiseArrRequest.push(p);
        }
        return Some<void | JRPCResponse<KeyAssignment>, BN | undefined>(promiseArrRequest, async (shareResponses, sharedState) => {
          // check if threshold number of nodes have returned the same user public key
          const completedRequests = shareResponses.filter((x) => x);
          const thresholdPublicKey = thresholdSame(
            shareResponses.map((x) => x && x.result && x.result.PublicKey),
            ~~(endpoints.length / 2) + 1
          );
          // optimistically run lagrange interpolation once threshold number of shares have been received
          // this is matched against the user public key to ensure that shares are consistent
          if (completedRequests.length >= ~~(endpoints.length / 2) + 1 && thresholdPublicKey) {
            const sharePromises: Promise<void | Buffer>[] = [];
            const nodeIndexes: BN[] = [];
            for (let i = 0; i < shareResponses.length; i += 1) {
              const currentShareResponse = shareResponses[i] as JRPCResponse<KeyAssignment>;
              if (currentShareResponse?.result) {
                const key = currentShareResponse.result;
                if (key.Metadata) {
                  const metadata = {
                    ephemPublicKey: Buffer.from(key.Metadata.ephemPublicKey, "hex"),
                    iv: Buffer.from(key.Metadata.iv, "hex"),
                    mac: Buffer.from(key.Metadata.mac, "hex"),
                    // mode: Buffer.from(key.Metadata.mode, "hex"),
                  };
                  sharePromises.push(
                    decrypt(tmpKey, {
                      ...metadata,
                      ciphertext: Buffer.from(key.Share, "base64"),
                    }).catch((err) => log.debug("share decryption", err))
                  );
                } else {
                  sharePromises.push(Promise.resolve(Buffer.from(key.Share, "hex")));
                }
              } else {
                sharePromises.push(Promise.resolve(undefined));
              }
              nodeIndexes.push(new BN(indexes[i]).add(new BN(1)));
            }
            const sharesResolved = await Promise.all(sharePromises);

            if (sharedState.resolved) return undefined;
            const shares = [],
              sharesIndexes = [];

            sharesResolved.forEach((curr, index) => {
              if (curr) {
                shares.push(Buffer.from(curr));
                sharesIndexes.push(Buffer.from(nodeIndexes[index].toArray()));
              }
            });

            if (!this.blsdkg) throw new Error("Undefined blsdkg");
            const privKey: Uint8Array = await new Promise((resolve, reject) => {
              this.blsdkg
                .init()
                .then(() => {
                  const blsPrivKey = this.blsdkg.interpolate(sharesIndexes, shares);
                  const blsPubKey = Buffer.from(this.blsdkg.get_pk(blsPrivKey));

                  if (blsPubKey.toString("hex") !== thresholdPublicKey) {
                    reject("Public key not same");
                  }
                  resolve(blsPrivKey);
                })
                .catch((err: any) => reject(err));
            });

            return new BN(privKey);
          }
          throw new Error("invalid");
        });
      })
      .then(async (returnedKey) => {
        const privateKey = returnedKey;
        if (!privateKey) throw new Error("Invalid private key returned");
        return {
          privKey: privateKey.toString("hex", 64),
        };
      });
  }

  async retrieveSharesMobile(
    typeOfLogin: string,
    endpoints: string[],
    indexes: number[],
    verifierParams: VerifierParams,
    idToken: string,
    extraParams: Record<string, unknown> = {}
  ): Promise<{ sharesIndexes: Buffer[]; shares: Buffer[]; thresholdPublicKey: string }> {
    const promiseArr = [];
    // generate temporary private and public key that is used to secure receive shares
    const tmpKey = generatePrivate();
    const pubKey = getPublic(tmpKey).toString("hex");
    const pubKeyX = pubKey.slice(2, 66);
    const pubKeyY = pubKey.slice(66);
    const tokenCommitment = keccak256(idToken);

    // make commitment requests to endpoints
    for (let i = 0; i < endpoints.length; i += 1) {
      const p = post<JRPCResponse<CommitmentRequestResult>>(
        endpoints[i],
        generateJsonRPCObject("CommitmentRequest", {
          tokencommitment: tokenCommitment.slice(2),
          temppubx: pubKeyX,
          temppuby: pubKeyY,
        })
      ).catch((err) => {
        log.error("commitment", err);
      });
      promiseArr.push(p);
    }
    // send share request once k + t number of commitment requests have completed
    return Some<void | JRPCResponse<CommitmentRequestResult>, (void | JRPCResponse<CommitmentRequestResult>)[]>(promiseArr, (resultArr) => {
      const completedRequests = resultArr.filter((x) => {
        if (!x || typeof x !== "object") {
          return false;
        }
        if (x.error) {
          return false;
        }
        return true;
      });
      if (completedRequests.length >= ~~(endpoints.length / 2) + 1) {
        return Promise.resolve(completedRequests);
      }
      return Promise.reject(new Error(`invalid ${JSON.stringify(resultArr)}`));
    }).then((responses) => {
      const promiseArrRequest: Promise<void | JRPCResponse<KeyAssignment>>[] = [];
      const nodeSigs = [];
      for (let i = 0; i < responses.length; i += 1) {
        if (responses[i]) nodeSigs.push((responses[i] as JRPCResponse<CommitmentRequestResult>).result);
      }
      for (let i = 0; i < endpoints.length; i += 1) {
        const p = post<JRPCResponse<KeyAssignment>>(
          endpoints[i],
          generateJsonRPCObject("ShareRequest", { typeOfLogin, ...verifierParams, idtoken: idToken, nodesignatures: nodeSigs, ...extraParams })
        ).catch((err) => log.error("share req", err));
        promiseArrRequest.push(p);
      }
      return Some<void | JRPCResponse<KeyAssignment>, { sharesIndexes: Buffer[]; shares: Buffer[]; thresholdPublicKey: string } | undefined>(
        promiseArrRequest,
        async (shareResponses, sharedState) => {
          // check if threshold number of nodes have returned the same user public key
          const completedRequests = shareResponses.filter((x) => x);
          const thresholdPublicKey = thresholdSame(
            shareResponses.map((x) => x && x.result && x.result.PublicKey),
            ~~(endpoints.length / 2) + 1
          );
          // optimistically run lagrange interpolation once threshold number of shares have been received
          // this is matched against the user public key to ensure that shares are consistent
          if (completedRequests.length >= ~~(endpoints.length / 2) + 1 && thresholdPublicKey) {
            const sharePromises: Promise<void | Buffer>[] = [];
            const nodeIndexes: BN[] = [];
            for (let i = 0; i < shareResponses.length; i += 1) {
              const currentShareResponse = shareResponses[i] as JRPCResponse<KeyAssignment>;
              if (currentShareResponse?.result) {
                const key = currentShareResponse.result;
                if (key.Metadata) {
                  const metadata = {
                    ephemPublicKey: Buffer.from(key.Metadata.ephemPublicKey, "hex"),
                    iv: Buffer.from(key.Metadata.iv, "hex"),
                    mac: Buffer.from(key.Metadata.mac, "hex"),
                    // mode: Buffer.from(key.Metadata.mode, "hex"),
                  };
                  sharePromises.push(
                    decrypt(tmpKey, {
                      ...metadata,
                      ciphertext: Buffer.from(key.Share, "base64"),
                    }).catch((err) => log.debug("share decryption", err))
                  );
                } else {
                  sharePromises.push(Promise.resolve(Buffer.from(key.Share, "hex")));
                }
              } else {
                sharePromises.push(Promise.resolve(undefined));
              }
              nodeIndexes.push(new BN(indexes[i]).add(new BN(1)));
            }
            const sharesResolved = await Promise.all(sharePromises);

            if (sharedState.resolved) return undefined;
            const shares = [],
              sharesIndexes = [];

            sharesResolved.forEach((curr, index) => {
              if (curr) {
                shares.push(Buffer.from(curr));
                sharesIndexes.push(Buffer.from(nodeIndexes[index].toArray()));
              }
            });
            return {
              sharesIndexes,
              shares,
              thresholdPublicKey,
            };
          }
          throw new Error("invalid");
        }
      );
    });
  }

  async getPrivKey(key: BN): Promise<RetrieveSharesResponse> {
    const privateKey = key;
    if (!privateKey) throw new Error("Invalid private key returned");
    return {
      privKey: privateKey.toString("hex", 64),
    };
  }

  async getMetadata(data: Omit<MetadataParams, "set_data" | "signature">, options: RequestInit = {}): Promise<BN> {
    try {
      const metadataResponse = await post<{ message?: string }>(`${this.metadataHost}/get`, data, options, { useAPIKey: true });
      if (!metadataResponse || !metadataResponse.message) {
        return new BN(0);
      }
      return new BN(metadataResponse.message, 16); // nonce
    } catch (error) {
      log.error("get metadata error", error);
      return new BN(0);
    }
  }

  generateMetadataParams(message: string, privateKey: BN): MetadataParams {
    const key = this.ec.keyFromPrivate(privateKey.toString("hex", 64));
    const setData = {
      data: message,
      timestamp: new BN(~~(this.serverTimeOffset + Date.now() / 1000)).toString(16),
    };
    const sig = key.sign(keccak256(stringify(setData)).slice(2));
    return {
      pub_key_X: key.getPublic().getX().toString("hex"),
      pub_key_Y: key.getPublic().getY().toString("hex"),
      set_data: setData,
      signature: Buffer.from(sig.r.toString(16, 64) + sig.s.toString(16, 64) + new BN("").toString(16, 2), "hex").toString("base64"),
    };
  }

  async setMetadata(data: MetadataParams, options: RequestInit = {}): Promise<string> {
    try {
      const metadataResponse = await post<{ message: string }>(`${this.metadataHost}/set`, data, options, { useAPIKey: true });
      return metadataResponse.message; // IPFS hash
    } catch (error) {
      log.error("set metadata error", error);
      return "";
    }
  }

  lagrangeInterpolation(shares: BN[], nodeIndex: BN[]): BN | null {
    if (shares.length !== nodeIndex.length) {
      return null;
    }
    let secret = new BN(0);
    for (let i = 0; i < shares.length; i += 1) {
      let upper = new BN(1);
      let lower = new BN(1);
      for (let j = 0; j < shares.length; j += 1) {
        if (i !== j) {
          upper = upper.mul(nodeIndex[j].neg());
          upper = upper.umod(this.ec.curve.n);
          let temp = nodeIndex[i].sub(nodeIndex[j]);
          temp = temp.umod(this.ec.curve.n);
          lower = lower.mul(temp).umod(this.ec.curve.n);
        }
      }
      let delta = upper.mul(lower.invm(this.ec.curve.n)).umod(this.ec.curve.n);
      delta = delta.mul(shares[i]).umod(this.ec.curve.n);
      secret = secret.add(delta);
    }
    return secret.umod(this.ec.curve.n);
  }

  async getOrSetNonce(X: string, Y: string, privKey?: BN, getOnly = false): Promise<GetOrSetNonceResult> {
    let data: Data;
    const msg = getOnly ? "getNonce" : "getOrSetNonce";
    if (privKey) {
      data = this.generateMetadataParams(msg, privKey);
    } else {
      data = {
        pub_key_X: X,
        pub_key_Y: Y,
        set_data: { data: msg },
      };
    }
    return post<GetOrSetNonceResult>(`${this.metadataHost}/get_or_set_nonce`, data, undefined, { useAPIKey: true });
  }

  async getNonce(X: string, Y: string, privKey?: BN): Promise<GetOrSetNonceResult> {
    return this.getOrSetNonce(X, Y, privKey, true);
  }

  getPostboxKeyFrom1OutOf1(privKey: string, nonce: string): string {
    const privKeyBN = new BN(privKey, 16);
    const nonceBN = new BN(nonce, 16);
    return privKeyBN.sub(nonceBN).umod(this.ec.curve.n).toString("hex");
  }
}

export default Torus;
