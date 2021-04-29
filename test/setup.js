/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const formData = require("form-data");
require("jsdom-global")("<!doctype html><html><body></body></html>", {
  url: "https://example.com",
});
require("ts-node").register({ project: path.resolve("tsconfig.json"), require: ["tsconfig-paths/register"] });

const register = require("@babel/register").default;

register({
  extensions: [".ts", ".js"],
  rootMode: "upward",
});

global.fetch = require("node-fetch");

global.FormData = formData;
