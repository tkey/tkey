# tKey

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
![npm](https://img.shields.io/npm/dw/@oraichain/core)

tKey is the underlying SDK used to implement [Web3Auth Plug n Play](https://github.com/web3auth/web3auth). This package can also be used to self host Web3Auth in your own system. tKey stands for Threshold Key, which refers to the management keys & shares generated using threshold cryptography.

## The `tKey` SDK

The `tKey` SDK manages private keys by generating shares of it using Shamir Secret Sharing. For example, for a 2 out of 3 (2/3) setup, we give the
user three shares: ShareA, ShareB, and ShareC.

- **ShareA** is stored on the user’s device: Implementation is device and system specific. For example, on mobile devices, the share could be stored
  in device storage secured via biometrics.
- **ShareB** is managed and split across Web3Auth's Auth Network, accessed by an OAuth login provider that a user owns.
- **ShareC** is a recovery share: An extra share to be kept by the user, possibly kept on a separate device, downloaded or based on user input with
  enough entropy (eg. password, security questions, hardware device etc.).

Similar to existing 2FA systems, a user needs to prove ownership of at least 2 out of 3 (2/3) shares, in order to retrieve his private key.

For more information, check out the [technical overview](https://hackmd.io/Tej2tf83SZOxZmz70ObEpg). Before integrating you can also check out the example for [tKey](https://github.com/tkey/tkey-example).

### To use the SDK in your application, please refer to our [SDK Reference](https://web3auth.io/docs/sdk/self-host/installation) in Web3Auth Documentation

## Features

- Typescript compatible. Includes Type definitions
- Fully composable API
- Module support (Include only those modules which you require)
- [Audited](https://github.com/tkey/audit)

## Packages

| Packages                            | `@latest` Version                                                                                                                                                       | Size                                                                                                                                                                               | Description                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 🐉 **tKey Standard Package**        |
| `@oraichain/default`                | [![npm version](https://img.shields.io/npm/v/@oraichain/default?label=%22%22)](https://www.npmjs.com/package/@oraichain/default/v/latest)                               | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/default?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/default@latest)                               | Bundles `Core` and `Modules` into one importable package        |
| 🏠 **Core**                         |
| `@oraichain/core`                   | [![npm version](https://img.shields.io/npm/v/@oraichain/core?label=%22%22)](https://www.npmjs.com/package/@oraichain/core/v/latest)                                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/core?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/core@latest)                                     | Core functionalities for creating a tkey                        |
| 🐕‍🦺 **Service Provider**             |
| `@oraichain/service-provider-torus` | [![npm version](https://img.shields.io/npm/v/@oraichain/service-provider-torus?label=%22%22)](https://www.npmjs.com/package/@oraichain/service-provider-torus/v/latest) | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/service-provider-torus?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/service-provider-torus@latest) | `@service-provider-base` with DirectAuth functionality          |
| 🗳 **Storage Layer**                 |
| `@oraichain/storage-layer-torus`    | [![npm version](https://img.shields.io/npm/v/@oraichain/storage-layer-torus?label=%22%22)](https://www.npmjs.com/package/@oraichain/storage-layer-torus/v/latest)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/storage-layer-torus?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/storage-layer-torus@latest)       | get/set metadata for various shares                             |
| 🔌 **Modules**                      |
| `@oraichain/chrome-storage`         | [![npm version](https://img.shields.io/npm/v/@oraichain/chrome-storage?label=%22%22)](https://www.npmjs.com/package/@oraichain/chrome-storage/v/latest)                 | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/chrome-storage?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/chrome-storage@latest)                 | Add/remove a share from chrome extension storage                |
| `@oraichain/web-storage`            | [![npm version](https://img.shields.io/npm/v/@oraichain/web-storage?label=%22%22)](https://www.npmjs.com/package/@oraichain/web-storage/v/latest)                       | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/web-storage?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/web-storage@latest)                       | Add/remove a share from local and file storage                  |
| `@oraichain/security-questions`     | [![npm version](https://img.shields.io/npm/v/@oraichain/security-questions?label=%22%22)](https://www.npmjs.com/package/@oraichain/security-questions/v/latest)         | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/security-questions?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/security-questions@latest)         | Add/remove a security question and password as a share for tkey |
| `@oraichain/share-transfer`         | [![npm version](https://img.shields.io/npm/v/@oraichain/share-transfer?label=%22%22)](https://www.npmjs.com/package/@oraichain/share-transfer/v/latest)                 | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/share-transfer?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/share-transfer@latest)                 | Transfer share from another device                              |
| `@oraichain/seed-phrase`            | [![npm version](https://img.shields.io/npm/v/@oraichain/seed-phrase?label=%22%22)](https://www.npmjs.com/package/@oraichain/seed-phrase/v/latest)                       | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/seed-phrase?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/seed-phrase@latest)                       | Store and use seedphrases on metadata                           |
| `@oraichain/private-keys`           | [![npm version](https://img.shields.io/npm/v/@oraichain/private-keys?label=%22%22)](https://www.npmjs.com/package/@oraichain/private-keys/v/latest)                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/private-keys?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/private-keys@latest)                     | Store extra private keys on tKey metadata                       |
| `@oraichain/share-serialization`    | [![npm version](https://img.shields.io/npm/v/@oraichain/share-serialization?label=%22%22)](https://www.npmjs.com/package/@oraichain/share-serialization/v/latest)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/share-serialization?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/share-serialization@latest)       | Import/export a share from tKey                                 |
| 🐉 **Low-Level**                    |
| `@oraichain/common-types`           | [![npm version](https://img.shields.io/npm/v/@oraichain/common-types?label=%22%22)](https://www.npmjs.com/package/@oraichain/common-types/v/latest)                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/common-types?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/common-types@latest)                     | Shared [TypeScript](https://www.typescriptlang.org/) Types      |

## Building the SDK Locally

### Requirements

- This package requires a peer dependency of `@babel/runtime`
- Node 14+

### Installation

```
git submodule add -f git@github.com:kawaii-islands/CustomAuth.git packages/CustomAuth
git submodule add -f git@github.com:kawaii-islands/torus.js.git packages/torus.js
npm install
```

Dev and watch packages change: `npm run dev`
Build packages: `npm run build`

```
cd packages/example
npm start
```

Run server metadata: git@github.com:kawaii-islands/metadata.git

## Bundling

Each sub package is distributed in 4 formats

- `esm` build `dist/<MODULE_NAME>.esm.js` in es6 format
- `commonjs` build `dist/<MODULE_NAME>.cjs.js` in es5 format
- `commonjs` build `dist/<MODULE_NAME>-bundled.cjs.js` in es5 format with problematic packages bundled (benfits non-webpack users)
- `umd` build `dist/<MODULE_NAME>.umd.min.js` in es5 format without polyfilling corejs minified

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
