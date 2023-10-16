# tKey Torus Storage Layer

[![npm version](https://img.shields.io/npm/v/@oraichain/storage-layer-torus?label=%22%22)](https://www.npmjs.com/package/@oraichain/storage-layer-torus/v/latest)       [![minzip](https://img.shields.io/bundlephobia/minzip/@oraichain/storage-layer-torus?label=%22%22)](https://bundlephobia.com/result?p=@oraichain/storage-layer-torus@latest)

A storage layer is needed to store and recall the metadata information of the shares generated so as to be able to recover the private key from the
tKeys generated. This SDK gives you the ability to get and set the Metadata for the various shares generated.

## Installation

```shell
npm install --save @oraichain/storage-layer-torus
```

## Instantiation

#### Import the `TorusStorageLayer` class from `@oraichain/storage-layer-torus`

```javascript
import TorusStorageLayer from "@oraichain/storage-layer-torus";
```

#### Assign the `TorusStorageLayer` class to a variable

```javascript
const storageLayer = new TorusStorageLayer(TorusStorageLayerArgs);
```

### Parameters

```ts
declare type TorusStorageLayerArgs = {
  enableLogging?: boolean;
  hostUrl?: string; // use `https://metadata.social-login.orai.io` for connecting to the Torus Metadata Server
  serverTimeOffset?: number;
};
```

## Example

```js
import TorusStorageLayer from "@oraichain/storage-layer-torus";

const storageLayer = new TorusStorageLayer({ hostUrl: "https://metadata.social-login.orai.io" });
```
