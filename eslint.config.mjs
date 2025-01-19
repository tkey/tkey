import toruslabsTypescript from "@toruslabs/eslint-config-typescript";

export default [
  ...toruslabsTypescript,
  {
    languageOptions: {
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
    },
  },
];
