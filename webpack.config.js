/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

const pkg = require("./package.json");

const pkgName = "threshold-bak";
const libraryName = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);

const packagesToInclude = ["broadcast-channel", "@toruslabs/torus.js", "@toruslabs/fetch-node-details"];

const { NODE_ENV = "production" } = process.env;

const baseConfig = {
  mode: NODE_ENV,
  devtool: NODE_ENV === "production" ? false : "source-map",
  entry: "./index.ts",
  target: "web",
  output: {
    path: path.resolve(__dirname, "dist"),
    library: libraryName,
    libraryExport: "default",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    alias: {
      "bn.js": path.resolve(__dirname, "node_modules/bn.js"),
      lodash: path.resolve(__dirname, "node_modules/lodash"),
      "js-sha3": path.resolve(__dirname, "node_modules/js-sha3"),
    },
  },
  module: {
    rules: [],
  },
};

// const optimization = {
//   optimization: {
//     minimize: false,
//   },
// };

const eslintLoader = {
  enforce: "pre",
  test: /\.js$/,
  exclude: /node_modules/,
  loader: "eslint-loader",
};

const babelLoaderWithPolyfills = {
  test: /\.m?js$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: "babel-loader",
  },
};

const tsLoader = {
  test: /\.ts?$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: "ts-loader",
    options: {
      // disable type checker - we will use it in fork plugin
      transpileOnly: true,
      configFile: NODE_ENV === "production" ? "tsconfig.prod.json" : "tsconfig.json",
    },
  },
};

const babelLoader = { ...babelLoaderWithPolyfills, use: { loader: "babel-loader", options: { plugins: ["@babel/transform-runtime"] } } };

const umdPolyfilledConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.polyfill.umd.min.js`,
    libraryTarget: "umd",
  },
  module: {
    rules: [tsLoader, eslintLoader, babelLoaderWithPolyfills],
  },
};

const umdConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.umd.min.js`,
    libraryTarget: "umd",
  },
  module: {
    rules: [tsLoader, eslintLoader, babelLoader],
  },
};

const cjsConfig = {
  ...baseConfig,
  // ...optimization,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.cjs.js`,
    libraryTarget: "commonjs2",
  },
  module: {
    rules: [tsLoader, eslintLoader, babelLoader],
  },
  externals: [...Object.keys(pkg.dependencies), /^(@babel\/runtime)/i],
  plugins: [new ForkTsCheckerWebpackPlugin()],
  node: {
    ...baseConfig.node,
    Buffer: false,
  },
};

const cjsBundledConfig = {
  ...baseConfig,
  // ...optimization,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}-bundled.cjs.js`,
    libraryTarget: "commonjs2",
  },
  module: {
    rules: [tsLoader, eslintLoader, babelLoader],
  },
  externals: [...Object.keys(pkg.dependencies).filter((x) => !packagesToInclude.includes(x)), /^(@babel\/runtime)/i],
};

module.exports = [umdPolyfilledConfig, umdConfig, cjsConfig, cjsBundledConfig];
// module.exports = [cjsConfig];
// V5
// experiments: {
//   outputModule: true
// }

// node: {
//   global: true,
// },
// resolve: {
//   alias: { crypto: 'crypto-browserify', stream: 'stream-browserify', vm: 'vm-browserify' },
//   aliasFields: ['browser'],
// },
