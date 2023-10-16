import FetchNodeDetails, { TORUS_NETWORK } from "@toruslabs/fetch-node-details";
import { expect } from "chai";
import faker from "faker";
import { keccak256 } from "web3-utils";

import { TorusPublicKey } from "../src";
import TorusUtils from "../src/torus";
import { generateIdToken } from "./helpers";

const TORUS_NODE_MANAGER = new FetchNodeDetails({
  network: TORUS_NETWORK.TESTNET,
  proxyAddress: FetchNodeDetails.PROXY_ADDRESS_TESTNET,
});
const TORUS_TEST_EMAIL = "hello@tor.us";
const TORUS_TEST_VERIFIER = "torus-test-health";
const TORUS_TEST_AGGREGATE_VERIFIER = "torus-test-health-aggregate";

describe("torus onekey", function () {
  let torus: TorusUtils;

  beforeEach("one time execution before all tests", async function () {
    torus = new TorusUtils({
      enableOneKey: true,
      network: "testnet",
    });
  });

  it("should still fetch v1 public address correctly", async function () {
    const verifier = "google-lrc"; // any verifier
    const verifierDetails = { verifier, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const publicAddress = (await torus.getPublicAddress(torusNodeEndpoints, torusNodePub, verifierDetails, true)) as TorusPublicKey;
    expect(publicAddress.typeOfUser).to.equal("v1");
    expect(publicAddress.address).to.equal("0xFf5aDad69F4e97AF4D4567e7C333C12df6836a70");
  });

  it("should still login v1 account correctly", async function () {
    const token = generateIdToken(TORUS_TEST_EMAIL, "ES256");
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusIndexes } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const retrieveSharesResponse = await torus.retrieveShares(
      torusNodeEndpoints,
      torusIndexes,
      TORUS_TEST_VERIFIER,
      { verifier_id: TORUS_TEST_EMAIL },
      token
    );
    expect(retrieveSharesResponse.privKey).to.be.equal("296045a5599afefda7afbdd1bf236358baff580a0fe2db62ae5c1bbe817fbae4");
  });

  it("should still aggregate account v1 user correctly", async function () {
    const idToken = generateIdToken(TORUS_TEST_EMAIL, "ES256");
    const hashedIdToken = keccak256(idToken);
    const verifierDetails = { verifier: TORUS_TEST_AGGREGATE_VERIFIER, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusIndexes } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const retrieveSharesResponse = await torus.retrieveShares(
      torusNodeEndpoints,
      torusIndexes,
      TORUS_TEST_AGGREGATE_VERIFIER,
      {
        verify_params: [{ verifier_id: TORUS_TEST_EMAIL, idtoken: idToken }],
        sub_verifier_ids: [TORUS_TEST_VERIFIER],
        verifier_id: TORUS_TEST_EMAIL,
      },
      hashedIdToken.substring(2)
    );
    expect(retrieveSharesResponse.ethAddress).to.be.equal("0xE1155dB406dAD89DdeE9FB9EfC29C8EedC2A0C8B");
  });

  it("should be able to key assign", async function () {
    const verifier = TORUS_TEST_VERIFIER; // any verifier
    const email = faker.internet.email();
    const verifierDetails = { verifier, verifierId: email };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const publicAddress = (await torus.getPublicAddress(torusNodeEndpoints, torusNodePub, verifierDetails, true)) as TorusPublicKey;
    expect(publicAddress.typeOfUser).to.equal("v2");
  });

  it("should still login v2 account correctly", async function () {
    const token = generateIdToken("Jonathan.Nolan@hotmail.com", "ES256");
    const verifierDetails = { verifier: TORUS_TEST_VERIFIER, verifierId: "Jonathan.Nolan@hotmail.com" };
    const { torusNodeEndpoints, torusIndexes } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const retrieveSharesResponse = await torus.retrieveShares(
      torusNodeEndpoints,
      torusIndexes,
      TORUS_TEST_VERIFIER,
      { verifier_id: "Jonathan.Nolan@hotmail.com" },
      token
    );
    expect(retrieveSharesResponse.privKey).to.be.equal("9ec5b0504e252e35218c7ce1e4660eac190a1505abfbec7102946f92ed750075");
    expect(retrieveSharesResponse.ethAddress).to.be.equal("0x2876820fd9536BD5dd874189A85d71eE8bDf64c2");
  });
});
