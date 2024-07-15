/* eslint-disable import/extensions */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const pkg = require("./package.json");
const pkgName = pkg.name.split("/")[1];

const { localBrowserConfig, browserStackConfig } = require("../../karmaBaseConfig");

module.exports = async (config) => {
  const generateWebpackConfig = await import("@toruslabs/torus-scripts/config/webpack.config.js");
  const torusConfig = (await import("@toruslabs/torus-scripts/config/torus.config.js")).default;
  torusConfig.umd = true;
  const webpackConfig = generateWebpackConfig.default(torusConfig.name);
  if (process.env.INFRA === "LOCAL") {
    config.set({ ...localBrowserConfig(webpackConfig, config, { args: [process.env.MOCKED, process.env.METADATA] }) });
  } else if (process.env.INFRA === "CLOUD") {
    config.set({ ...browserStackConfig(webpackConfig, config, { name: pkgName, args: [process.env.MOCKED, process.env.METADATA] }) });
  }
};
