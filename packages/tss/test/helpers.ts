import { IStorageLayer } from "@tkey/common-types";
import { MockStorageLayer, TorusStorageLayer } from "@tkey/storage-layer-torus";
import Torus from "@toruslabs/torus.js";
import { KJUR } from "jsrsasign";

import { TSSTorusServiceProvider } from "../src";

const { METADATA } = process.env;

export function initStorageLayer(): IStorageLayer {
  return METADATA === "mocked" ? new MockStorageLayer() : new TorusStorageLayer({ hostUrl: METADATA });
}

function generateIdToken(email: string): string {
  const privKey = `-----BEGIN PRIVATE KEY-----\nMEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==\n-----END PRIVATE KEY-----`;
  const alg = "ES256";
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "torus-key-test",
    aud: "torus-key-test",
    name: email,
    email,
    scope: "email",
    iat,
    eat: iat + 120,
  };

  const options = {
    expiresIn: "120",
    algorithm: alg,
  };

  const header = { alg, typ: "JWT" };

  const token = KJUR.jws.JWS.sign(alg, header, payload, privKey, options);

  return token;
}

export async function fetchPostboxKeyAndSigs(opts: { serviceProvider: TSSTorusServiceProvider; verifier: string; verifierId: string }) {
  const { serviceProvider, verifier, verifierId } = opts;

  const nodeDetails = await serviceProvider.customAuthInstance.nodeDetailManager.getNodeDetails({ verifier, verifierId });
  const token = generateIdToken(verifierId);

  const tKey = await serviceProvider.customAuthInstance.torus.retrieveShares(
    nodeDetails.torusNodeEndpoints,
    nodeDetails.torusIndexes,
    verifier,
    { verifier_id: verifierId },
    token,
    nodeDetails.torusNodePub
  );

  const signatures = tKey.sessionData.sessionTokenData.map((session) => JSON.stringify({ data: session.token, sig: session.signature }));

  const localPrivKey = Torus.getPostboxKey(tKey);
  return {
    signatures,
    postboxkey: localPrivKey,
  };
}
