/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const { IgnorePlugin } = require("webpack");

function generateWebpackConfig({ alias = {} }) {
  const baseConfig = {
    plugins: [new IgnorePlugin({ resourceRegExp: /^\.\/wordlists\/(?!english)/, contextRegExp: /bip39\/src$/ })],
    resolve: {
      plugins: [new TsconfigPathsPlugin()],
      alias: {
        ...alias,
      },
    },
  };
  return { baseConfig };
}

module.exports = generateWebpackConfig;
