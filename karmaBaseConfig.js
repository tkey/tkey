/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const playwright = require("playwright");

// setting is to 0 will load browser binaries from node_modules folder
// inside playwright
process.env.PLAYWRIGHT_BROWSERS_PATH = 0;
process.env.FIREFOX_BIN = playwright.firefox.executablePath();
process.env.CHROME_BIN = playwright.chromium.executablePath();
process.env.WEBKIT_HEADLESS_BIN = playwright.webkit.executablePath();

const localBrowserConfig = (webpackConfig, karmaConfig, packageConfig) => {
  return {
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: "",

    files: [{ pattern: "./test/*.js" }],

    preprocessors: {
      "./test/*.js": ["webpack"],
    },

    // frameworks to us
    frameworks: ["mocha", "webpack"],

    webpack: {
      module: webpackConfig[1].module,
      resolve: webpackConfig[1].resolve,
      plugins: webpackConfig[1].plugins,
    },

    plugins: ["karma-mocha-reporter", "karma-webkit-launcher", "karma-chrome-launcher", "karma-firefox-launcher", "karma-mocha", "karma-webpack"],

    client: {
      mocha: {
        timeout: 0,
      },
      args: packageConfig.args,
    },

    singleRun: true,

    reporters: ["mocha"],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    logLevel: karmaConfig.LOG_INFO,

    // Set the browser to run
    // can be overrided using --browsers args while running test command
    // but due to limitation in lerna package scoping cannot be done while
    // passing other args.
    // Args are passed in CI file as scoping is not required in CI,
    // for local testing , edit here directly.
    browsers: ["ChromeHeadless"],
  };
};

const browserStackConfig = (webpackConfig, karmaConfig, packageConfig) => ({
  browserStack: {
    username: process.env.BROWSER_STACK_USERNAME,
    accessKey: process.env.BROWSER_STACK_KEY,
    project: packageConfig.name,
  },
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: "",

  files: [{ pattern: "./test/*.js" }],

  preprocessors: {
    "./test/*.js": ["webpack"],
  },

  // frameworks to us
  frameworks: ["mocha", "webpack"],

  webpack: {
    module: webpackConfig[1].module,
    resolve: webpackConfig[1].resolve,
    plugins: webpackConfig[1].plugins,
  },

  plugins: ["karma-webpack", "karma-mocha", "karma-browserstack-launcher"],

  client: {
    mocha: {
      timeout: 0,
    },
    args: packageConfig.args,
  },

  reporters: ["progress", "BrowserStack"],

  // web server port
  port: 9876,

  concurrency: 1,

  singleRun: true,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // level of logging
  logLevel: karmaConfig.LOG_INFO,

  // define browsers
  customLaunchers: {
    bs_firefox_windows: {
      base: "BrowserStack",
      browser: "Chrome",
      browser_version: "90.0",
      os: "Windows",
      os_version: "10",
      video: false,
    },
  },

  browsers: ["bs_firefox_windows"],
});

module.exports = { localBrowserConfig, browserStackConfig };
