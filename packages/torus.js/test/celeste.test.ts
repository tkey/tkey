import NodeManager, { TORUS_NETWORK } from "@toruslabs/fetch-node-details";
import { expect } from "chai";
import faker from "faker";
import { keccak256 } from "web3-utils";

import TorusUtils from "../src/torus";
import { generateIdToken } from "./helpers";

const TORUS_TEST_EMAIL = "hello@tor.us";
const TORUS_TEST_VERIFIER = "torus-test-health";
const TORUS_TEST_AGGREGATE_VERIFIER = "torus-test-health-aggregate";

describe("torus utils celeste", function () {
  let torus: TorusUtils;
  let TORUS_NODE_MANAGER: NodeManager;

  beforeEach("one time execution before all tests", async function () {
    torus = new TorusUtils({
      signerHost: "https://signer-polygon.tor.us/api/sign",
      allowHost: "https://signer-polygon.tor.us/api/allow",
      network: "celeste",
    });
    TORUS_NODE_MANAGER = new NodeManager({ network: TORUS_NETWORK.CELESTE, proxyAddress: NodeManager.PROXY_ADDRESS_CELESTE });
  });
  it("should fetch public address", async function () {
    const verifier = "tkey-google-celeste"; // any verifier
    const verifierDetails = { verifier, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const publicAddress = await torus.getPublicAddress(torusNodeEndpoints, torusNodePub, verifierDetails);
    expect(publicAddress).to.equal("0xeC80FB9aB308Be1789Bd3f9317962D5505A4A242");
  });

  it("should fetch user type and public address", async function () {
    const verifier = "tkey-google-celeste"; // any verifier
    const verifierDetails = { verifier, verifierId: TORUS_TEST_EMAIL };
    const { torusNodeEndpoints, torusNodePub } = await TORUS_NODE_MANAGER.getNodeDetails(verifierDetails);
    const { address, typeOfUser } = await torus.getUserTypeAndAddress(torusNodeEndpoints, torusNodePub, verifierDetails);
    expect(address).to.equal("0xeC80FB9aB308Be1789Bd3f9317962D5505A4A242");
    expect(typeOfUser).to.equal("v1");

    const v2Verifier = "tkey-google-celeste";
    // 1/1 user
    const v2TestEmail = "somev2user@gmail.com";
    const { address: v2Address, typeOfUser: v2UserType } = await torus.getUserTypeAndAddress(torusNodeEndpoints, torusNodePub, {
      verifier: v2Verifier,
      verifierId: v2TestEmail,
    });
    expect(v2Address).to.equal("0x69fB3A96016817F698a1279aE2d65F3916F3Db6F");
    expect(v2UserType).to.equal("v1");

    // 2/n user
    const v2nTestEmail = "caspertorus@gmail.com";
    const { address: v2nAddress, typeOfUser: v2nUserType } = await torus.getUserTypeAndAddress(torusNodeEndpoints, torusNodePub, {
      verifier: v2Verifier,
      verifierId: v2nTestEmail,
    });
    expect(v2nAddress).to.equal("0x24aCac36F8A4bD93052207dA410dA71AF92258b7");
    expect(v2nUserType).to.equal("v1");
  });

  it("should be able to key assign", async function () {
    const verifier = "tkey-google-celeste"; // any verifier
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
    expect(retrieveSharesResponse.privKey).to.be.equal("0ae056aa938080c9e8bf6641261619e09fd510c91bb5aad14b0de9742085a914");
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
    expect(retrieveSharesResponse.ethAddress).to.be.equal("0x535Eb1AefFAc6f699A2a1A5846482d7b5b2BD564");
  });
});
