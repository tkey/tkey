/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const ESLintPlugin = require("eslint-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const generateLibraryName = (pkgName) => pkgName.charAt(0).toUpperCase() + pkgName.slice(1);

// loaders execute right to left

const packagesToInclude = ["@toruslabs/eccrypto", "elliptic", "bip39", "hdkey"];

const { NODE_ENV = "production" } = process.env;

const optimization = {
  optimization: {
    minimize: false,
  },
};

const babelLoaderWithPolyfills = {
  test: /\.(ts|js)x?$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: "babel-loader",
    options: {
      rootMode: "upward",
    },
  },
};

const babelLoader = {
  ...babelLoaderWithPolyfills,
  use: { loader: "babel-loader", options: { plugins: ["@babel/transform-runtime"], rootMode: "upward" } },
};

function generateWebpackConfig({ pkg, pkgName, currentPath, alias }) {
  const baseConfig = {
    mode: NODE_ENV,
    devtool: NODE_ENV === "production" ? false : "source-map",
    entry: path.resolve(currentPath, "index.ts"),
    target: "web",
    output: {
      path: path.resolve(currentPath, "dist"),
      library: generateLibraryName(pkgName),
      // libraryExport: "default",
    },
    resolve: {
      plugins: [new TsconfigPathsPlugin()],
      extensions: [".ts", ".js", ".json"],
      alias: {
        "bn.js": path.resolve(currentPath, "node_modules/bn.js"),
        lodash: path.resolve(currentPath, "node_modules/lodash"),
        ...alias,
      },
    },
    module: {
      rules: [],
    },
  };

  // const umdPolyfilledConfig = {
  //   ...baseConfig,
  //   output: {
  //     ...baseConfig.output,
  //     filename: `${pkgName}.polyfill.umd.min.js`,
  //     libraryTarget: "umd",
  //   },
  //   module: {
  //     rules: [babelLoaderWithPolyfills],
  //   },
  // };

  // const umdConfig = {
  //   ...baseConfig,
  //   output: {
  //     ...baseConfig.output,
  //     filename: `${pkgName}.umd.min.js`,
  //     libraryTarget: "umd",
  //   },
  //   module: {
  //     rules: [babelLoader],
  //   },
  // };

  const cjsConfig = {
    ...baseConfig,
    ...optimization,
    output: {
      ...baseConfig.output,
      filename: `${pkgName}.cjs.js`,
      libraryTarget: "commonjs2",
    },
    module: {
      rules: [babelLoader],
    },
    externals: [...Object.keys(pkg.dependencies), /^(@babel\/runtime)/i],
    node: {
      ...baseConfig.node,
      Buffer: false,
    },
  };

  // const cjsBundledConfig = {
  //   ...baseConfig,
  //   ...optimization,
  //   output: {
  //     ...baseConfig.output,
  //     filename: `${pkgName}-bundled.cjs.js`,
  //     libraryTarget: "commonjs2",
  //   },
  //   module: {
  //     rules: [babelLoader],
  //   },
  //   externals: [...Object.keys(pkg.dependencies).filter((x) => !packagesToInclude.includes(x)), /^(@babel\/runtime)/i],
  // };

  return [cjsConfig];
}

module.exports = generateWebpackConfig;
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
