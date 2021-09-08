/* eslint-disable @typescript-eslint/no-var-requires */
const pkg = require("./package.json");

const pkgName = pkg.name.split("/")[1];

const webpackConfig = require("./webpack.config");
const { localBrowserConfig, browserStackConfig } = require("../../karmaBaseConfig");

module.exports = (config) => {
  if (process.env.INFRA === "LOCAL") {
    config.set({ ...localBrowserConfig(webpackConfig, config, { args: [process.env.MOCKED, process.env.METADATA] }) });
  } else if (process.env.INFRA === "CLOUD") {
    config.set({ ...browserStackConfig(webpackConfig, config, { name: pkgName, args: [process.env.MOCKED, process.env.METADATA] }) });
  }
};
