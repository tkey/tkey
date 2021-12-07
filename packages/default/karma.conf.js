/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const pkg = require("./package.json");
const generateWebpackConfig = require("@toruslabs/torus-scripts/config/webpack.config");
const torusConfig = require("@toruslabs/torus-scripts/config/torus.config");
const pkgName = pkg.name.split("/")[1];

const webpackConfig = generateWebpackConfig(torusConfig.name);
const { localBrowserConfig, browserStackConfig } = require("../../karmaBaseConfig");

module.exports = (config) => {
  if (process.env.INFRA === "LOCAL") {
    config.set({ ...localBrowserConfig(webpackConfig, config, { args: [process.env.MOCKED] }) });
  } else if (process.env.INFRA === "CLOUD") {
    config.set({ ...browserStackConfig(webpackConfig, config, { name: pkgName, args: [process.env.MOCKED] }) });
  }
};
