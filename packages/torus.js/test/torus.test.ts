import NodeManager, { TORUS_NETWORK } from "@toruslabs/fetch-node-details";
import { expect } from "chai";
import faker from "faker";
import { keccak256 } from "web3-utils";

import TorusUtils from "../src/torus";
import { generateIdToken } from "./helpers";

const TORUS_TEST_EMAIL = "hello@tor.us";
const TORUS_TEST_VERIFIER = "torus-test-health";
const TORUS_TEST_AGGREGATE_VERIFIER = "torus-test-health-aggregate";

describe("torus utils goerli", function () {
  let torus: TorusUtils;
  let TORUS_NODE_MANAGER: NodeManager;

  beforeEach("one time execution before all tests", async function () {
    torus = new TorusUtils({ network: "testnet" });
    TORUS_NODE_MANAGER = new NodeManager({
      network: TORUS_NETWORK.TESTNET,
      proxyAddress: NodeManager.PROXY_ADDRESS_TESTNET,
    });
  });
  it("should fetch public address", async function () {
    const verifier = "google-lrc"; // any verifier
    const verifierDetails = { verifier, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, torusNodePub, verifierDetails);
    expect(publicAddress).to.equal("0xFf5aDad69F4e97AF4D4567e7C333C12df6836a70");
  });

  it("should fetch user type and public address", async function () {
    const verifier = "google-lrc"; // any verifier
    const verifierDetails = { verifier, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const { address, typeOfUser } = await torus.getUserTypeAndAddress(torusNodeEndpoints, torusNodePub, verifierDetails);
    expect(address).to.equal("0xFf5aDad69F4e97AF4D4567e7C333C12df6836a70");
    expect(typeOfUser).to.equal("v1");

    const v2Verifier = "tkey-google-lrc";
    // 1/1 user
    const v2TestEmail = "somev2user@gmail.com";
    const { address: v2Address, typeOfUser: v2UserType } = await torus.getUserTypeAndAddress(torusNodeEndpoints, torusNodePub, {
      verifier: v2Verifier,
      verifierId: v2TestEmail,
    });
    expect(v2Address).to.equal("0xE91200d82029603d73d6E307DbCbd9A7D0129d8D");
    expect(v2UserType).to.equal("v2");

    // 2/n user
    const v2nTestEmail = "caspertorus@gmail.com";
    const { address: v2nAddress, typeOfUser: v2nUserType } = await torus.getUserTypeAndAddress(torusNodeEndpoints, torusNodePub, {
      verifier: v2Verifier,
      verifierId: v2nTestEmail,
    });
    expect(v2nAddress).to.equal("0x1016DA7c47A04C76036637Ea02AcF1d29c64a456");
    expect(v2nUserType).to.equal("v2");
  });

  it("should be able to key assign", async function () {
    const verifier = "google-lrc"; // any verifier
    const email = faker.internet.email();
    const verifierDetails = { verifier, verifierId: email };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, torusNodePub, verifierDetails);
    expect(publicAddress).to.not.equal("");
    expect(publicAddress).to.not.equal(null);
  });

  it("should be able to login", async function () {
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
    expect(retrieveSharesResponse.privKey).to.be.equal("068ee4f97468ef1ae95d18554458d372e31968190ae38e377be59d8b3c9f7a25");
  });

  it("should be able to aggregate login", async function () {
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
    expect(retrieveSharesResponse.ethAddress).to.be.equal("0x5a165d2Ed4976BD104caDE1b2948a93B72FA91D2");
  });
});
