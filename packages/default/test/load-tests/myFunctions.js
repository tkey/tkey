/* eslint-disable no-console */
/* eslint-disable promise/always-return */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
//
// my-functions.js
//
global.fetch = fetch;
global.atob = atob;
global.btoa = btoa;

const TorusStorageLayer = require("@tkey/storage-layer-torus").default;
const { MockStorageLayer } = require("@tkey/storage-layer-torus");

const { generatePrivate } = require("@toruslabs/eccrypto");

const ServiceProviderBase = require("@tkey/service-provider-base").default;
const ThresholdKey = require("../../types").default;

function initStorageLayer(mocked, extraParams) {
  return mocked === "true" ? new MockStorageLayer({ serviceProvider: extraParams.serviceProvider }) : new TorusStorageLayer(extraParams);
}

const mocked = process.env.MOCKED || "false";
// const metadataURL = "http://localhost:5051";
const metadataURL = "http://ec2-52-68-162-65.ap-northeast-1.compute.amazonaws.com";

function setJSONBody(requestParams, context, ee, next) {
  const defaultSP2 = new ServiceProviderBase({ postboxKey: generatePrivate().toString("hex") });
  const defaultSL2 = new TorusStorageLayer({ serviceProvider: defaultSP2, hostUrl: metadataURL });

  const tb = new ThresholdKey({ serviceProvider: defaultSP2, storageLayer: defaultSL2 });

  const messages = [];
  for (let i = 0; i < 4; i += 1) {
    messages.push({ test: Math.random().toString(36).substring(7).repeat(1000) });
  }

  const privateKeys = [];
  for (let i = 0; i < 4; i += 1) {
    privateKeys.push(generatePrivate().toString("hex"));
  }

  tb.initializeNewKey()
    .then((_) => defaultSL2.setMetadataBulkStream({ input: messages, privKey: privateKeys }))
    .then((_) => {
      // console.log(res);
      // console.log(next);
      next();
    })
    .catch(console.error);
}

function logHeaders(requestParams, response, context, ee, next) {
  console.log("logging headers");
  console.log(response, context);
  return next(); // MUST be called for the scenario to continue
}

module.exports = {
  setJSONBody,
  logHeaders,
};
