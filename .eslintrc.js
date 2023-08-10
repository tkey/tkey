require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  root: true,
  extends: ["@toruslabs/typescript"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2022,
    project: "./tsconfig.json",
  },
  ignorePatterns: ["*.config.js", ".eslintrc.js"],
  globals: {
    atob: true,
    btoa: true,
    document: true,
    fetch: true,
    jest: true,
    it: true,
    beforeEach: true,
    afterEach: true,
    describe: true,
    expect: true,
    chrome: true,
    FileSystem: true,
    FileEntry: true,
  },
};
