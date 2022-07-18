# tKey Torus Storage Layer

A storage layer is needed to store and recall the metadata information of the shares generated so as to be able to recover the private key from the
tKeys generated. This SDK gives you the ability to get and set the Metadata for the various shares generated.

## Installation

```shell
npm install --save @tkey/storage-layer-torus
```

## Instantiation

#### Import the `TorusStorageLayer` class from `@tkey/storage-layer-torus`

```javascript
import TorusStorageLayer from "@tkey/storage-layer-torus";
```

#### Assign the `TorusStorageLayer` class to a variable

```javascript
const storageLayer = new TorusStorageLayer(TorusStorageLayerArgs);
```

### Parameters

```ts
declare type TorusStorageLayerArgs = {
  enableLogging?: boolean;
  hostUrl?: string; // use `https://metadata.tor.us` for connecting to the Torus Metadata Server
  serverTimeOffset?: number;
};
```

## Example

```js
import TorusStorageLayer from "@tkey/storage-layer-torus";

const storageLayer = new TorusStorageLayer({ hostUrl: "https://metadata.tor.us" });
```