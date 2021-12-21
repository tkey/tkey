/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const formData = require("form-data");
require("jsdom-global")(``, {
  url: "http://localhost",
});

// const storeFn = {
//   getItem(key) {
//     return this[key];
//   },
//   setItem(key, value) {
//     this[key] = value;
//   },
// };
// globalThis.localStorage = { ...storeFn };
// globalThis.sessionStorage = { ...storeFn };

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

globalThis.fetch = require("node-fetch");

globalThis.FormData = formData;
