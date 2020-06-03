const path = require('path')
const pkg = require('./package.json')

const pkgName = 'tdkm'
const libraryName = pkgName.charAt(0).toUpperCase() + pkgName.slice(1)

const packagesToInclude = ['eccrypto', 'elliptic', 'web3-utils', 'bn.js']

const baseConfig = {
  mode: 'production',
  entry: './index.js',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    library: libraryName,
    libraryExport: 'default',
  },
  optimization: { minimize: false },
  resolve: {
    alias: {
      'bn.js': path.resolve(__dirname, 'node_modules/bn.js'),
      lodash: path.resolve(__dirname, 'node_modules/lodash'),
    },
  },
  module: {
    rules: [],
  },
  node: {
    vm: 'empty',
  },
}

const eslintLoader = {
  enforce: 'pre',
  test: /\.js$/,
  exclude: /node_modules/,
  loader: 'eslint-loader',
}

const babelLoaderWithPolyfills = {
  test: /\.m?js$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: 'babel-loader',
  },
}

const babelLoader = { ...babelLoaderWithPolyfills, use: { loader: 'babel-loader', options: { plugins: ['@babel/transform-runtime'] } } }

const umdPolyfilledConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.polyfill.umd.min.js`,
    libraryTarget: 'umd',
  },
  module: {
    rules: [eslintLoader, babelLoaderWithPolyfills],
  },
}

const umdConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.umd.min.js`,
    libraryTarget: 'umd',
  },
  module: {
    rules: [eslintLoader, babelLoader],
  },
}

const cjsConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.cjs.js`,
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [eslintLoader, babelLoader],
  },
  externals: [...Object.keys(pkg.dependencies).filter((x) => !packagesToInclude.includes(x)), /^(@babel\/runtime)/i],
}

module.exports = [ cjsConfig]
// module.exports = [cjsConfig]

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
