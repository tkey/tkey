# `@tkey/seed-phrase`

This module can be used to add seedphrases to tkey. The seedphrase is encrypted using pubkey of tkey. 

## Usage

```
const chromeStorage = require('@tkey/seed-phrase');

await tb.modules.seedPhrase.setSeedPhrase("HD Key Tree"); // set seedphrase


// the function is marked CRTITAL because it will result in the loss of oldSeedPhrase
await tb.modules.seedPhrase.CRITICAL_changeSeedPhrase(oldSeedPhrase, newSeedPhrase); // change seedphrase
```
