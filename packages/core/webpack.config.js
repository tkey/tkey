/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const generateWebpackConfig = require("../../webpack.config");

const pkg = require("./package.json");

const pkgName = pkg.name;

const currentPath = path.resolve(".");

const config = generateWebpackConfig({ currentPath, pkg, pkgName, alias: { "js-sha3": path.resolve(currentPath, "node_modules/js-sha3") } });

module.exports = config;
