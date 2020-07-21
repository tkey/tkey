module.exports = {
  devServer: {
    https: false,
    host: "localhost",
    port: 3000, // CHANGE YOUR PORT HERE!
    hotOnly: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    historyApiFallback: {
      rewrites: [
        { from: /serviceworker\/redirect/, to: "/serviceworker/redirect.html" },
        { from: /./, to: "/index.html" },
      ],
    },
    quiet: true
  },
  // configureWebpack: (config) => {
  //   // config.devtool = 'source-map'
  // },
  // chainWebpack: config => {
  //   config.module
  //     .rule('sourcemap')
  //     .test(/\.js$/)
  //     .enforce('pre')
  //     .use('source-map-loader')
  //     .loader('source-map-loader')
  //     .end()
  // }
};
