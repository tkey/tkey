# tKey Single Factor Auth Service Provider

[![npm version](https://img.shields.io/npm/v/@tkey/service-provider-torus?label=%22%22)](https://www.npmjs.com/package/@tkey/service-provider-torus/v/latest) [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/service-provider-torus?label=%22%22)](https://bundlephobia.com/result?p=@tkey/service-provider-torus@latest)

Service Provider in `tKey` is used for generating a social login share of the private key share managed by a wallet service provider via
their own authentication flows.

## Installation

```shell
npm install --save @tkey/service-provider-sfa
```

### See the full [SDK Reference](https://web3auth.io/docs/sdk/core-kit/tkey/usage#log-in) on the Web3Auth Documentation

## Example

```js
import SFAServiceProvider from '@tkey/service-provider-sfa';

const web3AuthOptions: any = {
  clientId, // Get your Client ID from Web3Auth Dashboard
  chainConfig,
  web3AuthNetwork: 'testnet', // ["cyan", "testnet"]
};

const serviceProvider = new SFAServiceProvider({web3AuthOptions});
```
