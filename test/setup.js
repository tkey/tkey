/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const fetch = require("node-fetch");
const atob = require("atob");
const btoa = require("btoa");
require("jsdom-global")("<!doctype html><html><body></body></html>", {
  url: "https://example.com",
});
require("ts-node").register({ project: path.resolve("tsconfig.json"), require: ["tsconfig-paths/register"] });

const register = require("@babel/register").default;

register({
  extensions: [".ts", ".js"],
  rootMode: "upward",
});

global.fetch = fetch;
global.atob = atob;
global.btoa = btoa;
