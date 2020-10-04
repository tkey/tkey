/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const generateWebpackConfig = require("../../webpack.config");

const pkg = require("./package.json");

const pkgName = pkg.name.split("/")[1];

const currentPath = path.resolve(".");

const config = generateWebpackConfig({ currentPath, pkg, pkgName });

module.exports = config;
