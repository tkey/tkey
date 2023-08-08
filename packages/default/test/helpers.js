import { ecCurve, getPubKeyPoint, Point } from "@tkey-mpc/common-types";
import ServiceProviderBase from "@tkey-mpc/service-provider-base";
import ServiceProviderTorus from "@tkey-mpc/service-provider-torus";
import TorusStorageLayer, { MockStorageLayer } from "@tkey-mpc/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";
import { generatePolynomial, getShare, hexPoint, MockServer, postEndpoint } from "@toruslabs/rss-client";
// eslint-disable-next-line import/no-extraneous-dependencies
import Torus from "@toruslabs/torus.js";
import BN from "bn.js";
// eslint-disable-next-line import/no-extraneous-dependencies
import KJUR from "jsrsasign";

let mocked;
const isNode = process.release;
if (!isNode) {
  // eslint-disable-next-line no-undef
  [mocked] = __karma__.config.args;
} else {
  mocked = process.env.MOCKED || "false";
}

export const isMocked = mocked === "true";

export function getMetadataUrl() {
  let metadataURL = process.env.METADATA || "http://localhost:5051";
  if (!isNode) {
    // eslint-disable-next-line no-undef
    [, metadataURL] = __karma__.config.args;
  }
  return metadataURL;
}

export function initStorageLayer(extraParams) {
  return mocked === "true" ? new MockStorageLayer() : new TorusStorageLayer(extraParams);
}

export function getServiceProvider(params) {
  const { type, privKeyBN, isEmptyProvider } = params;
  const PRIVATE_KEY = privKeyBN ? privKeyBN.toString("hex") : generatePrivate().toString("hex");
  if (type === "TorusServiceProvider") {
    return new ServiceProviderTorus({
      postboxKey: isEmptyProvider ? null : PRIVATE_KEY,
      customAuthArgs: {
        network: "sapphire_mainnet",

        web3AuthClientId: "YOUR_CLIENT_ID",
        // this url has no effect as postbox key is passed
        // passing it just to satisfy direct auth checks.
        baseUrl: "http://localhost:3000",
      },
    });
  }
  return new ServiceProviderBase({ postboxKey: isEmptyProvider ? null : PRIVATE_KEY });
}

export async function setupTSSMocks(opts) {
  let { serviceProvider, verifierName, verifierId, maxTSSNonceToSimulate, tssTag } = opts;
  tssTag = tssTag || "default";
  serviceProvider._setVerifierNameVerifierId(verifierName, verifierId);
  const vid = serviceProvider.getVerifierNameVerifierId();
  maxTSSNonceToSimulate = maxTSSNonceToSimulate || 1;
  const serverEndpoints = [new MockServer(), new MockServer(), new MockServer(), new MockServer(), new MockServer()];
  const serverCount = serverEndpoints.length;
  const serverPrivKeys = [];
  for (let i = 0; i < serverCount; i++) {
    serverPrivKeys.push(new BN(generatePrivate()));
  }
  const serverPubKeys = serverPrivKeys.map((privKey) => hexPoint(ecCurve.g.mul(privKey)));
  const serverThreshold = 3;
  await Promise.all(
    serverEndpoints.map((endpoint, i) => {
      return postEndpoint(endpoint, "/private_key", { private_key: serverPrivKeys[i].toString(16, 64) });
    })
  );

  // set tssShares on servers
  const serverDKGPrivKeys = [];
  const serverDKGPubKeys = [];

  for (let j = 0; j < maxTSSNonceToSimulate; j++) {
    // simulate new key assign
    const dkg2Priv = new BN(generatePrivate());
    const dkg2Pub = ecCurve.g.mul(dkg2Priv);
    const serverPoly = generatePolynomial(serverThreshold - 1, dkg2Priv);
    serverDKGPrivKeys.push(serverPoly[0]);
    serverDKGPubKeys.push(getPubKeyPoint(serverPoly[0]));
    await Promise.all(
      serverEndpoints.map((endpoint, i) => {
        const shareHex = getShare(serverPoly, i + 1).toString(16, 64);

        return postEndpoint(endpoint, "/tss_share", {
          label: `${vid}\u0015${tssTag}\u0016${j}`,
          tss_share_hex: shareHex,
        });
      })
    );
    serviceProvider._setTSSPubKey("default", j, new Point(dkg2Pub.x, dkg2Pub.y));
  }

  serviceProvider._setTSSNodeDetails(serverEndpoints, serverPubKeys, serverThreshold);

  return {
    serverEndpoints,
    serverPubKeys,
    serverDKGPrivKeys,
    serverDKGPubKeys,
  };
}

const jwtPrivateKey = `-----BEGIN PRIVATE KEY-----\nMEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==\n-----END PRIVATE KEY-----`;
export const generateIdToken = (email) => {
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
    expiresIn: 120,
    algorithm: alg,
  };

  const header = { alg, typ: "JWT" };

  const token = KJUR.jws.JWS.sign(alg, header, payload, jwtPrivateKey, options);

  return token;
};

export async function fetchPostboxKeyAndSigs(opts) {
  const { serviceProvider, verifierName, verifierId } = opts;
  const { serverEndpoints: sssEndpoints } = await serviceProvider.getSSSNodeDetails();
  const token = generateIdToken(verifierId);
  const retrieveSharesResponse = await serviceProvider.directWeb.torus.retrieveShares(
    sssEndpoints,
    [],
    verifierName,
    { verifier_id: verifierId },
    token
  );

  const signatures = [];
  retrieveSharesResponse.sessionData.sessionTokenData.filter((session) => {
    if (session) {
      signatures.push(
        JSON.stringify({
          data: session.token,
          sig: session.signature,
        })
      );
    }
    return null;
  });

  const localPrivKey = Torus.getPostboxKey(retrieveSharesResponse);
  return {
    signatures,
    postboxkey: localPrivKey,
  };
}
// this function is only for testing and will return tss shares only for test verifiers.
export async function assignTssDkgKeys(opts) {
  let { serviceProvider, verifierName, verifierId, maxTSSNonceToSimulate, tssTag } = opts;
  tssTag = tssTag || "default";
  maxTSSNonceToSimulate = maxTSSNonceToSimulate || 1;
  // set tssShares on servers
  const serverDKGPrivKeys = [];
  // const serverDKGPubKeys = [];

  for (let j = 0; j < maxTSSNonceToSimulate; j++) {
    const token = generateIdToken(verifierId);
    const extendedVerifierId = `${verifierId}\u0015${tssTag}\u0016${j}`;
    console.log("extendedVerifierId", extendedVerifierId);

    const { serverEndpoints: sssEndpoints } = await serviceProvider.getSSSNodeDetails();
    const retrieveSharesResponse = await serviceProvider.directWeb.torus.retrieveShares(
      sssEndpoints,
      [],
      verifierName,
      { verifier_id: verifierId, extended_verifier_id: extendedVerifierId },
      token
    );
    const localPrivKey = Torus.getPostboxKey(retrieveSharesResponse);

    serverDKGPrivKeys.push(new BN(localPrivKey, "hex"));
  }

  return {
    serverDKGPrivKeys,
    // serverDKGPubKeys,
  };
}
