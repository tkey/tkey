/* eslint-disable no-console */
import NodeManager from "@toruslabs/fetch-node-details";

import TorusUtils from "../dist/torusUtils-node";

const fetchNodeDetails = new NodeManager();
const torus = new TorusUtils({ network: "mainnet" });
const verifier = "google"; // any verifier
const verifierId = "hello@tor.us"; // any verifier id
fetchNodeDetails
  .getNodeDetails({ verifier, verifierId })
  .then(({ torusNodeEndpoints, torusNodePub }) => torus.getPublicAddress(torusNodeEndpoints, torusNodePub, { verifier, verifierId }))
  .then((publicAddress) => console.log(publicAddress))
  .catch(console.error);

// To run: node -r @babel/register test/index.js
