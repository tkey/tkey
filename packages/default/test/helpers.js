import { ecCurve, getPubKeyPoint, Point } from "@tkey/common-types";
import ServiceProviderBase from "@tkey/service-provider-base";
import ServiceProviderTorus from "@tkey/service-provider-torus";
import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";
import { generatePrivate } from "@toruslabs/eccrypto";
import { generatePolynomial, getShare, hexPoint, MockServer, postEndpoint } from "@toruslabs/rss-client";
import BN from "bn.js";

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
