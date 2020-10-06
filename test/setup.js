/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");

console.log(path.resolve("tsconfig.json"));
require("ts-node").register({ project: path.resolve("tsconfig.json"), require: ["tsconfig-paths/register"] });

const register = require("@babel/register").default;

register({
  extensions: [".ts", ".js"],
  rootMode: "upward",
});
