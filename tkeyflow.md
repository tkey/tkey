ok.. the flow goes like this
1.  Decide the modules you want apart from the ones included in default (you can override)
```
const modules = {
    [SECURITY_QUESTIONS_MODULE_NAME]: new SecurityQuestionsModule(),
    [WEB_STORAGE_MODULE_NAME]: new WebStorageModule(),
  };
```
2.  Create tkey instance (using @tkey/default)
```
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
```
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
```
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

```
// This function initializes the login/creates tkey using the modules
// Say if webstorage module is used,
// serviceProvider is the first share and localStorage is the second and (2/2) is created
await tKey.initialize();

// If you add password using security questions module
await tKey.modules[SECURITY_QUESTIONS_MODULE_KEY].generateNewShareWithSecurityQuestions(password, "What is your password?")
```

2. Reconstruct the tKey
```
const { privKey } = await tKey.reconstructKey(false)
```

Login flow:

1. Initialize tkey first
```
await tKey.initialize()
```

This will use the modules and inform if you need any additional shares for tKey reconstruction to complete
```
// requiredShares is the no.of additional shares you need to input
// You need to take input from the user if any additional shares are required
const { requiredShares } = tKey.getKeyDetails()
```

2. If `requiredShares === 0`, you can reconstruct the key
```
const { privKey } = await tKey.reconstructKey(false)
```