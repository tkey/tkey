# tKey

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
![npm](https://img.shields.io/npm/dw/@tkey/core)

| Packages                       | `@latest` Version                                                                                                                                           | Size                                                                                                                                                                   | Description                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 🏠 **Core**                    |
| `@tkey/core`                   | [![npm version](https://img.shields.io/npm/v/@tkey/core/latest.svg)](https://www.npmjs.com/package/@tkey/core/v/latest)                                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/core/latest.svg)](https://bundlephobia.com/result?p=@tkey/core@latest)                                     | Core functionalities for creating a tkey                                     |
| `@tkey/service-provider-base`  | [![npm version](https://img.shields.io/npm/v/@tkey/service-provider-base/latest.svg)](https://www.npmjs.com/package/@tkey/service-provider-base/v/latest)   | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/service-provider-base/latest.svg)](https://bundlephobia.com/result?p=@tkey/service-provider-base@latest)   | Accepts a private key which can be used to create one of the shares the tkey |
| 🔌 **Modules**                 |
| `@tkey/chrome-storage`         | [![npm version](https://img.shields.io/npm/v/@tkey/chrome-storage/latest.svg)](https://www.npmjs.com/package/@tkey/chrome-storage/v/latest)                 | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/chrome-storage/latest.svg)](https://bundlephobia.com/result?p=@tkey/chrome-storage@latest)                 | Add/remove a share from chrome extension storage                             |
| `@tkey/web-storage`            | [![npm version](https://img.shields.io/npm/v/@tkey/web-storage/latest.svg)](https://www.npmjs.com/package/@tkey/web-storage/v/latest)                       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/web-storage/latest.svg)](https://bundlephobia.com/result?p=@tkey/web-storage@latest)                       | Add/remove a share from local and file storage                               |
| `@tkey/security-questions`     | [![npm version](https://img.shields.io/npm/v/@tkey/security-questions/latest.svg)](https://www.npmjs.com/package/@tkey/security-questions/v/latest)         | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/security-questions/latest.svg)](https://bundlephobia.com/result?p=@tkey/security-questions@latest)         | Add/remove a security question and password as a share for tkey              |
| `@tkey/share-transfer`         | [![npm version](https://img.shields.io/npm/v/@tkey/share-transfer/latest.svg)](https://www.npmjs.com/package/@tkey/share-transfer/v/latest)                 | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/share-transfer/latest.svg)](https://bundlephobia.com/result?p=@tkey/share-transfer@latest)                 | Transfer share from another device                                           |
| `@tkey/seed-phrase`            | [![npm version](https://img.shields.io/npm/v/@tkey/seed-phrase/latest.svg)](https://www.npmjs.com/package/@tkey/seed-phrase/v/latest)                       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/seed-phrase/latest.svg)](https://bundlephobia.com/result?p=@tkey/seed-phrase@latest)                       | Store and use seedphrases on metadata                                        |
| `@tkey/private-keys`           | [![npm version](https://img.shields.io/npm/v/@tkey/private-keys/latest.svg)](https://www.npmjs.com/package/@tkey/private-keys/v/latest)                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/private-keys/latest.svg)](https://bundlephobia.com/result?p=@tkey/private-keys@latest)                     | Store extra private keys on tKey metadata                                    |
| `@tkey/share-serialization`    | [![npm version](https://img.shields.io/npm/v/@tkey/share-serialization/latest.svg)](https://www.npmjs.com/package/@tkey/share-serialization/v/latest)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/share-serialization/latest.svg)](https://bundlephobia.com/result?p=@tkey/share-serialization@latest)       | Import/export a share from tKey                                       |
| 🐉 **Torus**                   |
| `@tkey/default`                | [![npm version](https://img.shields.io/npm/v/@tkey/default/latest.svg)](https://www.npmjs.com/package/@tkey/default/v/latest)                               | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/default/latest.svg)](https://bundlephobia.com/result?p=@tkey/default@latest)                               | Bundles `Core` and `Modules` into one importable package                     |
| `@tkey/service-provider-torus` | [![npm version](https://img.shields.io/npm/v/@tkey/service-provider-torus/latest.svg)](https://www.npmjs.com/package/@tkey/service-provider-torus/v/latest) | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/service-provider-torus/latest.svg)](https://bundlephobia.com/result?p=@tkey/service-provider-torus@latest) | `@service-provider-base` with DirectAuth functionality                       |
| `@tkey/storage-layer-torus`    | [![npm version](https://img.shields.io/npm/v/@tkey/storage-layer-torus/latest.svg)](https://www.npmjs.com/package/@tkey/storage-layer-torus/v/latest)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/storage-layer-torus/latest.svg)](https://bundlephobia.com/result?p=@tkey/storage-layer-torus@latest)       | get/set metadata for various shares                                          |
| 🐉 **Low-Level**               |
| `@tkey/common-types`           | [![npm version](https://img.shields.io/npm/v/@tkey/common-types/latest.svg)](https://www.npmjs.com/package/@tkey/common-types/v/latest)                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/common-types/latest.svg)](https://bundlephobia.com/result?p=@tkey/common-types@latest)                     | Shared [TypeScript](https://www.typescriptlang.org/) Types                   |

tKey manages private keys using the user’s device, private input, and wallet service provider. As long as a user has access to 2 out of 3 (2/3) of these shares, they will be able to retrieve their private key. For more information, checkout the [technical overview](https://hackmd.io/Tej2tf83SZOxZmz70ObEpg). Before integrating you can also checkout the example site for [tKey](https://vue-tkey.tor.us).

The following are steps of how to use the SDK in your application:

## Features

- Typescript compatible. Includes Type definitions
- Fully composable API
- Module support (Include only those modules which you require)
- [Audited](https://github.com/tkey/audit)

## Installation

```
yarn run bootstrap
yarn run pack:lerna
```

### Bundling

Each sub package is distributed in 4 formats

- `commonjs` build `dist/<MODULE_NAME>.cjs.js` in es5 format
- `commonjs` build `dist/<MODULE_NAME>-bundled.cjs.js` in es5 format with problematic packages bundled (benfits non-webpack users)
- `umd` build `dist/<MODULE_NAME>.umd.min.js` in es5 format without polyfilling corejs minified
- `umd` build `dist/<MODULE_NAME>.polyfill.umd.min.js` in es5 format with polyfilling corejs minified

By default, the appropriate format is used for your specified usecase
You can use a different format (if you know what you're doing) by referencing the correct file

The cjs build is not polyfilled with core-js.
It is upto the user to polyfill based on the browserlist they target

### Directly in Browser

CDN's serve the non-core-js polyfilled version by default. You can use a different

jsdeliver

```js
<script src="https://cdn.jsdelivr.net/npm/<MODULE_NAME>"></script>
```

unpkg

```js
<script src="https://unpkg.com/<MODULE_NAME>"></script>
```

### Tips for NUXT

This is a plugin that works [only on the client side](https://nuxtjs.org/guide/plugins/#client-side-only). So please register it as a ssr-free plugin.

## Usage

### Pre-cursors

Before including the tKey SDK, we first need to setup [directAuth](https://github.com/torusresearch/torus-direct-web-sdk) for the Google logins etc... Below are several steps:

`npm i @tkey/default`

1. If you're using redirectToOpener, modify the origin of postMessage from "http://localhost:3000" to your hosted domain in redirect.html and sw.js

2. Serve service worker from baseUrl where baseUrl is the one passed while instantiating tkey for specific login (example http://localhost:3000/serviceworker/). If you're already using a sw, please ensure to port over the fetch override from our service worker

3. For browsers where service workers are not supported or if you wish not to use service workers, create and serve redirect page from baseUrl/redirect where baseUrl is the one passed while instantiating tkey for specific login ( example http://localhost:3000/serviceworker/)

4. At verifier's interface (where you obtain client id), please use baseUrl/redirect (eg: http://localhost:3000/serviceworker/redirect) as the redirect_uri where baseUrl is the one passed while instantiating tkey

Now we can proceed to the basic usage, for your own application reach out to hello@tor.us to get your verifier spun up on the testnet today!!

### Basic Usage

Packages who wish to use torus defaults can use @tkey/default to initialize

```js
import ThresholdKey from "@tkey/default";
import WebStorageModule, { WEB_STORAGE_MODULE_NAME } from "@tkey/web-storage";
import SecurityQuestionsModule, { SECURITY_QUESTIONS_MODULE_NAME } from "@tkey/security-questions";

// Torus service provider uses directAuth to fetch users private key from the set of Torus nodes. This private key is one of the share in TSS.
// directAuth requires a deployment of a verifier with your clientId. Use developer.tor.us to create your verifier.
// Can use ServiceProviderBase which takes private key as input instead
const serviceProvider = new TorusServiceProvider({
  directParams: {
    baseUrl: "<REDIRECT_URL>",
    network: "testnet", // or mainnet
    proxyContractAddress: "0x4023d2a0D330bF11426B12C6144Cfb96B7fa6183", // corresponding proxy contract address of the specified network
  },
});
// or
const serviceProvider = new ServiceProviderBase({
  postboxKey: "<BASE PRIVATE KEY>",
});

// Storage layer used by the service provider
// Can use Custom storage layer which fits IStorageLayer interface
const storageLayer = new TorusStorageLayer({ hostUrl: "https://metadata.tor.us", serviceProvider });

const tkey = new ThresholdKey({
  modules: {
    // More modules can be passed to create additional shares.
    [WEB_STORAGE_MODULE_NAME]: new WebStorageModule(),
  },
  serviceProvider,
  storageLayer,
});


await tkey.serviceProvider.init({ skipSw: true });

// triggers google login.
// After google login succeeds, initialise tkey, metadata and its modules. (Minimum one share is required to read from the storage layer. In this case it was google login)
// In case of web applications, we create another share and store it on browsers local storage. This makes the threshold 2/2. You can use modules to create additional shares

await tkey.serviceProvider.triggerLogin({
  typeOfLogin: "google",
  name: "Google",
  clientId: "<GOOGLE_CLIENT_ID>",
  verifier: "<VERIFIER_NAME>",
});

/**
 * initialize({params})
 * @param params? {
 * withShare?: ShareStore; // Initialize with specific share, by default service provider will be used
 * importKey?: BN; // Select specific private key to split
 * neverInitializeNewKey?: boolean; // Initialize the SDK only if tkey already exists
 * }
 * @returns KeyDetails
 */

await tkey.initialize({});

// Private key reconstruction
const reconstructedKey = await tkey.reconstructKey();
```

### Creating 2/3 tkey

Developers who wish to customize can use @tkey/core.

```js
// Constructor
const tkey = new ThresholdKey({
  modules: {
    // More modules can be passed to create additional shares.
    [SECURITY_QUESTIONS_MODULE_NAME]: new SecurityQuestionsModule(),
    [WEB_STORAGE_MODULE_NAME]: new WebStorageModule(),
  },
  serviceProvider,
  storageLayer,
});

await tkey.serviceProvider.init({ skipSw: true });

// triggers google login.
await tkey.serviceProvider.triggerLogin({
  typeOfLogin: "google",
  name: "Google",
  clientId: "<GOOGLE_CLIENT_ID>",
  verifier: "<VERIFIER_NAME>",
});

await tkey.initialize();
const reconstructedKey = await tkey.reconstructKey(); // created 2/2 tkey. Both shares will be required to reconstruct tkey.

// Creating a security question share.
// Resulting threshold - 2/3. reconstructed key remains same.
await tkey.modules.securityQuestions.generateNewShareWithSecurityQuestions("myanswer", "myquestion?");

// Creating a password share.
// Resulting threshold - 2/3.
await tkey.modules.securityQuestions.generateNewShareWithSecurityQuestions("mypassword", "what is your password?");
```

### Usage of manualSync parameter.

The `manualSync` parameter can be used to save the tkey transitions locally. Following are the benefits of using this parameter:

1. This allows to create m/n threshold key in one step. 
2. For a multiscreen signup flow, you can serialize/deserialize the sdk from one page to another without pushing the changes to the cloud.
3. Rollback to previous tkey state in case of unexpected errors.

```js
// Constructor
const tkey = new ThresholdKey({
  modules: {
    // More modules can be passed to create additional shares.
    [SECURITY_QUESTIONS_MODULE_NAME]: new SecurityQuestionsModule(),
    [WEB_STORAGE_MODULE_NAME]: new WebStorageModule(),
  },
  serviceProvider,
  storageLayer,
  manualSync: true
});

await tkey.initialize();
const reconstructedKey = await tkey.reconstructKey(); // created 2/2 tkey. All changes are local.
await tkey.modules.securityQuestions.generateNewShareWithSecurityQuestions("mypassword", "what is your password?"); // update threshold to 2/3. All changes are local
await tkey.syncLocalMetadataTransitions() // push metadata to cloud
```

### Export and import shares as mnemonics

```js
// Constructor
const tkey = new ThresholdKey({
  modules: {
    // Share serialization is included in @tkey/default. Import it explicitly if you are using @tkey/core
    [SHARE_SERIALIZATION_MODULE_NAME]: new ShareSerializationModule(),
  },
  serviceProvider,
  storageLayer,
  manualSync: true
});

const exportedSeedShare = await tb.outputShare(resp1.deviceShare.share.shareIndex, "mnemonic"); // exported as 24-word mnemonic

await tb2.inputShare(exportedSeedShare.toString("hex"), "mnemonic"); // import share-mnemonic

```

### Import existing seedphrases and private keys

These imported private keys/seed phrases are encrypted (with threshold key) and stored on share's metadata. They have no relation to threshold key or shares. Usually, they are used by users with existing keys. 

```js

const metamaskSeedPhraseFormat = new MetamaskSeedPhraseFormat("https://mainnet.infura.io/v3/bca735fdbba0408bb09471e86463ae68");
const privateKeyFormat = new SECP256k1Format();

// Constructor
const tkey = new ThresholdKey({
  modules: { 
    seedPhrase: new SeedPhraseModule([metamaskSeedPhraseFormat]), 
    privateKeyModule: new PrivateKeyModule([privateKeyFormat]) 
  },
  serviceProvider,
  storageLayer,
  manualSync: true
});

// You will have to reconstruct key to get seedphrase/private keys back

// get/set private keys
const actualPrivateKeys = [
        new BN("4bd0041b7654a9b16a7268a5de7982f2422b15635c4fd170c140dc4897624390", "hex"),
        new BN("1ea6edde61c750ec02896e9ac7fe9ac0b48a3630594fdf52ad5305470a2635c0", "hex"),
      ];
await tb.modules.privateKeyModule.setPrivateKey("secp256k1n", actualPrivateKeys[0]);
await tb.modules.privateKeyModule.getAccounts();

// get/set seedphrase
const seedPhraseToSet = "object brass success calm lizard science syrup planet exercise parade honey impulse";
await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree", seedPhraseToSet);
const returnedSeed = await tb.modules.seedPhrase.getSeedPhrases();

```


### Advanced: Create 4/5 tkey

There are many ways to create m/n threshold key. Following is an example of how to create a 4/5 tkey.

```js
// created 2/5 tkey
const resp1 = await tkey._initializeNewKey({ initializeModules: true });
const { newShareStores: newShareStores1, newShareIndex: newShareIndex1 } = await tkey.generateNewShare(); // 2/3
const { newShareStores: newShareStores2, newShareIndex: newShareIndex2 } = await tkey.generateNewShare(); // 2/4
const { newShareIndex: newShareIndex3 } = await tkey.generateNewShare(); // 2/5
await tkey.reconstructKey();

const pubPoly = tkey.metadata.getLatestPublicPolynomial();
const previousPolyID = pubPoly.getPolynomialID();
const existingShareIndexes = tkey.metadata.getShareIndexesForPolynomial(previousPolyID);

// increase thresold to 4. 4/5 tkey
// _refreshShares() is an internal function. Use it with caution.
await tkey._refreshShares(4, existingShareIndexes, previousPolyID);

const tkey2 = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, manualSync: mode });
await tkey2.initialize({ neverInitializeNewKey: true });
tkey2.inputShareStore(resp1.deviceShare);
tkey2.inputShareStore(newShareStores1[newShareIndex1.toString("hex")]);
tkey2.inputShareStore(newShareStores2[newShareIndex2.toString("hex")]);
await tkey2.reconstructKey();
```
