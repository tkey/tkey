# tKey Web Storage Module

[![npm version](https://img.shields.io/npm/v/@tkey/tss?label=%22%22)](https://www.npmjs.com/package/@tkey/tss/v/latest)                       
[![minzip](https://img.shields.io/bundlephobia/minzip/@tkey/tss?label=%22%22)](https://bundlephobia.com/result?p=@tkey/tss@latest)

The tKey TSS Module enable tss- Threshold Signature Scheme (MPC - multi Party Computing) feature. This module is the part of the [tKey SDK](https://github.com/tkey/tkey/).

## Installation

```shell
npm install --save @tkey/tss
```

## Initialization

#### Import the `TSSModule` class from `@tkey/tss`

```javascript
import TSSModule from "@tkey/tss";
```

#### Assign the `TSSModule` class to a variable

```javascript
const tssModule = new TSSModule(params);
```

### Parameters

`params`

- `tkey`: `ThresholdKey`
- `moduleName` = `TSS_MODULE_NAME`, 
- `tssTag` = `default`
### Returns

The `TSSModule` class returns an object with the following properties:

```ts
class TSSModule {
  moduleName: string;
  tkey: ThresholdKey;
  tssTag: string;
 
  async setModuleReferences(api: ThresholdKey): Promise<void>
    async initializeWithTss(
    tssOptions: { deviceTSSShare: BN; deviceTSSIndex: number; factorPub: Point },
    params?: {
      withShare?: ShareStore;
      importKey?: BN;
      neverInitializeNewKey?: boolean;
      transitionMetadata?: IMetadata;
      previouslyFetchedCloudMetadata?: IMetadata;
      previousLocalMetadataTransitions?: LocalMetadataTransitions;
      delete1OutOf1?: boolean;
    }
  )
  
  getTSSCommits(): Point[]
   
  getTSSPub(): Point 

  async getTSSShare(factorKey: BN, opts?: { threshold: number }): Promise<{ tssIndex: number; tssShare: BN }> 
  
  getFactorEncs(factorPub: Point): FactorEnc 
  
  async generateNewShare(tssOptions?: {
    inputTSSShare: BN;
    inputTSSIndex: number;
    newFactorPub: Point;
    newTSSIndex: number;
    authSignatures?: string[];
    selectedServers?: number[];
  }): Promise<GenerateNewShareResult> 

  async deleteShare(
    tssOptions: {
      inputTSSShare: BN;
      inputTSSIndex: number;
      factorPub: Point;
      authSignatures: string[];
      selectedServers?: number[];
    },
    shareIndex: BNString
  ) : Promise<void>
}
```

## Usage

With the `TSSModule`, you've access to the following functions:
