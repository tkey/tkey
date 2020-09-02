# tKey

tKey manages private keys using the user’s device, private input, and wallet service provider. As long as a user has access to 2 out of 3 (2/3) of these shares, they will be able to retrieve their private key. For more information, checkout the [technical overview](https://hackmd.io/Tej2tf83SZOxZmz70ObEpg). Before integrating you can also checkout the example site for [tKey](https://vue-tkey.tor.us). 

The following are steps of how to use the SDK in your application:

## Pre-cursors
Before including the tKey SDK, we first need to setup [directAuth](https://github.com/torusresearch/torus-direct-web-sdk) for the Google logins etc... Below are several steps: 

```npm i @tkey/core```

1. If you're using redirectToOpener, modify the origin of postMessage from "http://localhost:3000" to your hosted domain in redirect.html and sw.js

2. Serve service worker from baseUrl where baseUrl is the one passed while instantiating DirectWebSdk for specific login (example http://localhost:3000/serviceworker/). If you're already using a sw, please ensure to port over the fetch override from our service worker

3. For browsers where service workers are not supported or if you wish not to use service workers, create and serve redirect page from baseUrl/redirect where baseUrl is the one passed while instantiating DirectWebSdk for specific login ( example http://localhost:3000/serviceworker/)

4. At verifier's interface (where you obtain client id), please use baseUrl/redirect (eg: http://localhost:3000/serviceworker/redirect) as the redirect_uri where baseUrl is the one passed while instantiating DirectWebSdk

Now we can proceed to the basic installation, for your own application reach out to hello@tor.us to get your verifier spun up on the testnet today!!

## Basic Installation

```js
import ThresholdKey, { WebStorageModule, SecurityQuestionsModule, TorusServiceProvider, TorusStorageLayer } from "tkey";

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
await tkey.serviceProvider.init({ skipSw: true });

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
