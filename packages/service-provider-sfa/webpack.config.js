/* eslint-disable @typescript-eslint/no-var-requires */
const generateWebpackConfig = require("../../webpack.config");

const config = generateWebpackConfig({  });

exports.baseConfig = config.baseConfig;
