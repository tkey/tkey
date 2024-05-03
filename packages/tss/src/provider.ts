import { Point } from "@tkey/common-types";
import { TorusServiceProvider } from "@tkey/service-provider-torus";
import { PointHex } from "@toruslabs/rss-client";

import { getExtendedVerifierId } from "./util";

export class TSSTorusServiceProvider extends TorusServiceProvider {
  verifierName?: string;

  verifierId?: string;

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

    const nodeDetails = await this.customAuthInstance.nodeDetailManager.getNodeDetails({ verifier: this.verifierName, verifierId: this.verifierId });
    const tssServerPub = await this.customAuthInstance.torus.getPublicAddress(nodeDetails.torusNodeSSSEndpoints, nodeDetails.torusNodePub, {
      verifier: this.verifierName,
      verifierId: this.verifierId,
      extendedVerifierId: getExtendedVerifierId(this.verifierId, tssTag, tssNonce),
    });

    return {
      pubKey: new Point(tssServerPub.finalKeyData.X, tssServerPub.finalKeyData.Y, this.keyType),
      nodeIndexes: tssServerPub.nodesData.nodeIndexes || [],
    };
  }

  getVerifierNameVerifierId(): string {
    return `${this.verifierName}\u001c${this.verifierId}`;
  }
}
