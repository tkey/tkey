import { Point } from "@tkey/common-types";
import { TorusServiceProvider } from "@tkey/service-provider-torus";
import { PointHex } from "@toruslabs/rss-client";
import { TorusPublicKey } from "@toruslabs/torus.js";

export class TSSTorusServiceProvider extends TorusServiceProvider {
  verifierName?: string;

  verifierId?: string;

  verifierType?: "normal" | "aggregate" | "hybrid";

  sssNodeDetails: {
    serverEndpoints: string[];
    serverPubKeys: PointHex[];
    serverThreshold: number;
  };

  async getSSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    if (!this.verifierName) throw new Error("no verifierName, not logged in");

    const { torusNodeSSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } = await this.customAuthInstance.nodeDetailManager.getNodeDetails({
      verifier: this.verifierName,
      verifierId: this.verifierId,
    });
    return {
      serverEndpoints: tssNodeEndpoints,
      serverPubKeys: torusPubKeys.map((key) => {
        return {
          x: key.X,
          y: key.Y,
        };
      }),
      serverThreshold: Math.ceil(tssNodeEndpoints.length / 2),
    };
  }

  async getRSSNodeDetails(): Promise<{ serverEndpoints: string[]; serverPubKeys: PointHex[]; serverThreshold: number }> {
    if (!this.verifierId) throw new Error("no verifierId, not logged in");
    if (!this.verifierName) throw new Error("no verifierName, not logged in");

    const { torusNodeRSSEndpoints: tssNodeEndpoints, torusNodePub: torusPubKeys } = await this.customAuthInstance.nodeDetailManager.getNodeDetails({
      verifier: this.verifierName,
      verifierId: this.verifierId,
    });

    return {
      serverEndpoints: tssNodeEndpoints,
      serverPubKeys: torusPubKeys.map((key) => {
        return {
          x: key.X,
          y: key.Y,
        };
      }),
      serverThreshold: Math.ceil(tssNodeEndpoints.length / 2),
    };
  }

  async getTSSPubKey(
    tssTag: string,
    tssNonce: number
  ): Promise<{
    pubKey: Point;
    nodeIndexes?: number[];
  }> {
    if (!this.verifierName || !this.verifierId) throw new Error("verifier userinfo not found, not logged in yet");
    const { serverPubKeys, serverEndpoints } = await this.getSSSNodeDetails();
    const tssServerPub = (await this.customAuthInstance.torus.getPublicAddress(
      serverEndpoints,
      serverPubKeys.map((node) => ({ X: node.x, Y: node.y })),
      {
        verifier: this.verifierName,
        verifierId: this.verifierId,
        extendedVerifierId: `${this.verifierId}\u0015${tssTag || "default"}\u0016${tssNonce || 0}`,
      }
    )) as TorusPublicKey;

    return {
      pubKey: new Point(tssServerPub.finalKeyData.X, tssServerPub.finalKeyData.Y),
      nodeIndexes: tssServerPub.nodesData.nodeIndexes || [],
    };
  }

  getVerifierNameVerifierId(): string {
    return `${this.verifierName}\u001c${this.verifierId}`;
  }
}
