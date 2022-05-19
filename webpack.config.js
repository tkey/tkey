/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const { IgnorePlugin } = require("webpack");

function generateWebpackConfig({ pkg, currentPath, alias }) {
  const depsList = Object.keys(pkg.dependencies);
  const baseConfig = {
    plugins: [new IgnorePlugin({ resourceRegExp: /^\.\/wordlists\/(?!english)/, contextRegExp: /bip39\/src$/ })],
    resolve: {
      plugins: [new TsconfigPathsPlugin()],
      alias: {
        ...(depsList.includes("bn.js") && { "bn.js": path.resolve(currentPath, "node_modules/bn.js") }),
        // ...(depsList.includes("elliptic") && { elliptic: path.resolve(currentPath, "node_modules/elliptic") }),
        // ...(depsList.includes("lodash") && { lodash: path.resolve(currentPath, "node_modules/lodash") }),
        ...alias,
      },
      fallback: {
        "bn.js": require.resolve("bn.js"),
      },
    },
  };
  return { baseConfig };
}

module.exports = generateWebpackConfig;
