# tKey

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
![npm](https://img.shields.io/npm/dw/@tkey-mpc/core)

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

For more information, check out the [technical overview](https://hackmd.io/Tej2tf83SZOxZmz70ObEpg). Before integrating you can also check out the example  for [tKey](https://github.com/tkey/tkey-example).

### To use the SDK in your application, please refer to our [SDK Reference](https://web3auth.io/docs/sdk/self-host/installation) in Web3Auth Documentation

## Features

- Typescript compatible. Includes Type definitions
- Fully composable API
- Module support (Include only those modules which you require)
- [Audited](https://github.com/tkey/audit)

## Packages

| Packages                       | `@latest` Version                                                                                                                                             | Size                                                                                                                                                                     | Description                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 🐉 **tKey Standard Package**                   |
| `@tkey-mpc/default`                | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/default?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/default/v/latest)                               | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/default?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/default@latest)                               | Bundles `Core` and `Modules` into one importable package                     |
| 🏠 **Core**                    |
| `@tkey-mpc/core`                   | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/core?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/core/v/latest)                                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/core?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/core@latest)                                     | Core functionalities for creating a tkey                                     |
| 🐕‍🦺 **Service Provider**                   |
| `@tkey-mpc/service-provider-torus` | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/service-provider-torus?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/service-provider-torus/v/latest) | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/service-provider-torus?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/service-provider-torus@latest) | `@service-provider-base` with DirectAuth functionality                       |
| 🗳 **Storage Layer**                   |
| `@tkey-mpc/storage-layer-torus`    | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/storage-layer-torus?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/storage-layer-torus/v/latest)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/storage-layer-torus?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/storage-layer-torus@latest)       | get/set metadata for various shares                                          |
| 🔌 **Modules**                 |
| `@tkey-mpc/chrome-storage`         | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/chrome-storage?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/chrome-storage/v/latest)                 | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/chrome-storage?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/chrome-storage@latest)                 | Add/remove a share from chrome extension storage                             |
| `@tkey-mpc/web-storage`            | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/web-storage?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/web-storage/v/latest)                       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/web-storage?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/web-storage@latest)                       | Add/remove a share from local and file storage                               |
| `@tkey-mpc/security-questions`     | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/security-questions?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/security-questions/v/latest)         | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/security-questions?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/security-questions@latest)         | Add/remove a security question and password as a share for tkey              |
| `@tkey-mpc/share-transfer`         | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/share-transfer?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/share-transfer/v/latest)                 | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/share-transfer?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/share-transfer@latest)                 | Transfer share from another device                                           |
| `@tkey-mpc/seed-phrase`            | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/seed-phrase?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/seed-phrase/v/latest)                       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/seed-phrase?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/seed-phrase@latest)                       | Store and use seedphrases on metadata                                        |
| `@tkey-mpc/private-keys`           | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/private-keys?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/private-keys/v/latest)                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/private-keys?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/private-keys@latest)                     | Store extra private keys on tKey metadata                                    |
| `@tkey-mpc/share-serialization`    | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/share-serialization?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/share-serialization/v/latest)       | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/share-serialization?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/share-serialization@latest)       | Import/export a share from tKey                                              |
| 🐉 **Low-Level**               |
| `@tkey-mpc/common-types`           | [![npm version](https://img.shields.io/npm/v/@tkey-mpc/common-types?label=%22%22)](https://www.npmjs.com/package/@tkey-mpc/common-types/v/latest)                     | [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey-mpc/common-types?label=%22%22)](https://bundlephobia.com/result?p=@tkey-mpc/common-types@latest)                     | Shared [TypeScript](https://www.typescriptlang.org/) Types                   |

## Building the SDK Locally

### Requirements

- This package requires a peer dependency of `@babel/runtime`
- Node 14+

### Installation

```
npm run bootstrap
npm run pack:lerna
```

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
