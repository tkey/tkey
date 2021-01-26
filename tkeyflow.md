ok.. the flow goes like this
1.  Decide the modules you want apart from the ones included in default (you can override)
```js
const modules = {
    [SECURITY_QUESTIONS_MODULE_NAME]: new SecurityQuestionsModule(),
    [WEB_STORAGE_MODULE_NAME]: new WebStorageModule(),
  };
```
2.  Create tkey instance (using @tkey/default)
```js
const directParams = {
  baseUrl: `${window.location.origin}/serviceworker`,
  network: 'testnet',
};

const tKey = new ThresholdKey({
    modules,
    directParams,
  });
```

3. Log the user in with google/fb
```js
const verifierParams = {
  verifier: 'google-lrc',
  clientId:
    '221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com',
  typeOfLogin: 'google',
};

const directAuthResponse = await tKey.serviceProvider.triggerLogin(
      verifierParams,
    );
const postboxKey = tKey.serviceProvider.postboxKey.toString('hex');
```

4. Depending on your UI flows, you may wish to check if user already has a tkey or not
   This is where you educate an user about tkey and device storage etc.
```js
const metadata = await tKey.storageLayer.getMetadata({ privKey: postboxKey });
const isNewKey = metadata.message === "KEY_NOT_FOUND";
```
The flow is of two parts here: 
a: creation
b: login

Creation Flow:

1. You may want the user to set a password, add a recovery email or store the device share to `FileStorage`
   i.e., add extra authentication factors for better recoverability
   You can prompt the user for input for all these params

```js
// This function initializes the login/creates tkey using the modules
// Say if webstorage module is used,
// serviceProvider is the first share and localStorage is the second and (2/2) is created
await tKey.initialize();

// If you add password using security questions module
await tKey.modules[SECURITY_QUESTIONS_MODULE_KEY].generateNewShareWithSecurityQuestions(password, "What is your password?")
```

2. Reconstruct the tKey
```js
const { privKey } = await tKey.reconstructKey(false)
```

Login flow:

1. Initialize tkey first
```js
await tKey.initialize()
```

This will use the modules and inform if you need any additional shares for tKey reconstruction to complete
```js
// requiredShares is the no.of additional shares you need to input
// You need to take input from the user if any additional shares are required
const { requiredShares } = tKey.getKeyDetails()
```

2. If `requiredShares === 0`, you can reconstruct the key
```js
const { privKey } = await tKey.reconstructKey(false)
```


Additional Features:

- To Store share on file storage in addition to localStorage, call

```js
// First get your device share using
const deviceShare = await tKey.modules[WEB_STORAGE_MODULE_KEY].getDeviceShare()
// Now, pass this to store on file storage
await tKey.modules[WEB_STORAGE_MODULE_KEY].storeDeviceShareOnFileStorage(deviceShare.share.shareIndex)
```

- To send a recovery share in email
  
```js
const shareCreated = await tKey.generateNewShare()
const requiredShareStore = shareCreated.newShareStores[shareCreated.newShareIndex.toString('hex')]
// remember to include in initializtion modules
const serializedShare = await tKey.modules[SHARE_SERIALIZATION_MODULE_KEY].serialize(requiredShareStore.share.share, 'mnemonic')
// Now, this serializedShare is a mnemonic which you can display to user/send mail
```
