const path = require("path");
exports.baseConfig = {
  resolve: {
    alias: {
      "bn.js": path.resolve(__dirname, "node_modules/bn.js"),
      lodash: path.resolve(__dirname, "node_modules/lodash"),
      "js-sha3": path.resolve(__dirname, "node_modules/js-sha3"),
    },
    fallback: {
      "bn.js": require.resolve("bn.js"),
      "js-sha3": require.resolve("js-sha3"),
    },
  },
};
