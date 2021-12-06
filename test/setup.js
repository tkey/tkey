/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const formData = require("form-data");
require("jsdom-global")();
require("ts-node").register({
  project: path.resolve(".", "tsconfig.json"),
  require: ["tsconfig-paths/register"],
  transpileOnly: true,
  compilerOptions: { module: "commonjs" },
});

const register = require("@babel/register").default;

register({
  extensions: [".ts", ".js"],
  rootMode: "upward",
});

global.fetch = require("node-fetch");

global.FormData = formData;

const storeFn = {
  getItem(key) {
    return this[key];
  },
  setItem(key, value) {
    this[key] = value;
  },
};
global.localStorage = { ...storeFn };
global.sessionStorage = { ...storeFn };
