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
  let { serviceProvider, deviceTSSShare, deviceTSSIndex, testId, maxTSSNonceToSimulate } = opts;
  maxTSSNonceToSimulate = maxTSSNonceToSimulate || 1;
  const tss1 = new BN(generatePrivate());
  const mockServersDKGPub = getPubKeyPoint(tss1);
  deviceTSSShare = deviceTSSShare || new BN(generatePrivate());
  deviceTSSIndex = deviceTSSIndex || 2;
  serviceProvider._setTSSPubKey("default", 0, mockServersDKGPub);
  const serverEndpoints = [new MockServer(), new MockServer(), new MockServer(), new MockServer(), new MockServer()];
  const serverCount = serverEndpoints.length;
  const serverPrivKeys = [];
  for (let i = 0; i < serverCount; i++) {
    serverPrivKeys.push(new BN(generatePrivate()));
  }
  const serverPubKeys = serverPrivKeys.map((privKey) => hexPoint(ecCurve.g.mul(privKey)));
  await Promise.all(
    serverEndpoints.map((endpoint, i) => {
      return postEndpoint(endpoint, "/private_key", { private_key: serverPrivKeys[i].toString(16, 64) });
    })
  );
  const serverThreshold = 3;
  const serverPoly = generatePolynomial(serverThreshold - 1, tss1);

  // set tssShares on servers
  await Promise.all(
    serverEndpoints.map((endpoint, i) => {
      return postEndpoint(endpoint, "/tss_share", {
        label: `${testId}\u0015default\u00160`,
        tss_share_hex: getShare(serverPoly, i + 1).toString(16, 64),
      });
    })
  );

  for (let j = 0; j < maxTSSNonceToSimulate; j++) {
    // simulate new key assign
    const dkg2Priv = new BN(generatePrivate());
    const dkg2Pub = ecCurve.g.mul(dkg2Priv);
    const serverPoly2 = generatePolynomial(serverThreshold - 1, dkg2Priv);
    await Promise.all(
      serverEndpoints.map((endpoint, i) => {
        const shareHex = getShare(serverPoly2, i + 1).toString(16, 64);

        return postEndpoint(endpoint, "/tss_share", {
          label: `${testId}\u0015default\u00161`,
          tss_share_hex: shareHex,
        });
      })
    );
    serviceProvider._setTSSPubKey("default", 1, new Point(dkg2Pub.x, dkg2Pub.y));
  }

  return {
    deviceTSSShare,
    deviceTSSIndex,
    serverEndpoints,
    serverPubKeys,
  };
}
