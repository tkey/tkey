# tKey Share Serialization Module

[![npm version](https://img.shields.io/npm/v/@tkey/mnemonic?label=%22%22)](https://www.npmjs.com/package/@tkey/mnemonic/v/latest)        [![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/mnemonic?label=%22%22)](https://bundlephobia.com/result?p=@tkey/mnemonic@latest)

The Share Serialization Module helps you add or remove the and password as a share for tkey. This module is the part of the [tKey SDK](https://github.com/tkey/tkey/).

## Installation

```shell
npm install --save @tkey/mnemonic
```

## Initialization

#### Import the `MnemonicModule` class from `@tkey/mnemonic`

```javascript
import MnemonicModule from "@tkey/mnemonic";
```

#### Assign the `MnemonicModule` class to a variable

```javascript
const mnemonicModule = new MnemonicModule();
```

### Returns

The `MnemonicModule` class returns an object with the following properties:

```ts
declare class MnemonicModule implements IModule {
  moduleName: string;
  constructor();
  async importShare(tkey: ITkeyApi, menmonic: string );
  async exportShare(tkey: ITkeyApi, shareIndex: BNString)
}
```

## Usage

With the `MnemonicModule`, you've access to the following functions:
