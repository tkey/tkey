# tkey

tKey manages private keys using the user’s device, private input, and wallet service provider. As long as a user has access to 2 out of 3 (2/3) of these shares, they will be able to retrieve their private key.

## Basic Installation

```js
import { ThresholdBak, SecurityQuestionsModule, ChromeExtensionStorageModule, TorusServiceProvider, TorusStorageLayer } from "threshold-bak";

// Torus service provider uses directAuth to fetch users private key from the set of Torus nodes. This private key is one of the share in TSS.
// directAuth requires a deployment of a verifier with your clientId. Reach out to us for verifier deployment.
const serviceProvider = new TorusServiceProvider({
  directParams: {
    GOOGLE_CLIENT_ID: "<GOOGLE_CLIENT_ID>",
    baseUrl: "<REDIRECT_URL>",
    network: "ropsten", // or mainnet
    proxyContractAddress: "0x4023d2a0D330bF11426B12C6144Cfb96B7fa6183" // corresponding proxy contract address of the specified network
  }
});

// Storage layer used by the service provider
const storageLayer = new TorusStorageLayer({ hostUrl: "https://metadata.tor.us", serviceProvider });

// Constructor
const tkey = new ThresholdKey({
  modules: {
    // More modules can be passed to create additional shares.
    securityQuestions: new SecurityQuestionsModule()
  },
  serviceProvider,
  storageLayer
});

// triggers google login.
await tkey.serviceProvider.directWeb.init({ skipSw: true });

// After google login succeeds, initialise tkey, metadata and its modules. (Minimum one share is required to read from the storage layer. In this case it was google login)
// In case of web applications, we create another share and store it on browsers local storage. This makes the threshold 2/2. You can use modules to create additional shares
await tkey.initialize();

// Private key reconstruction
const reconstructedKey = await tkey.reconstructKey();
```

## Adding additional shares

```js
// Creating a security question share.
// This requires initialisation of ThresholdKey with Security question module
// Resulting threshold - 2/3.
// reconstructed key remains same.
await tkey.modules.securityQuestions.generateNewShareWithSecurityQuestions("myanswer", "myquestion?");

// Creating a password share.
// Resulting threshold - 2/3.
await tkey.modules.securityQuestions.generateNewShareWithSecurityQuestions("mypassword", "what's is your password?");
```
