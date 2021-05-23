<template>
  <div id="app">
    <p class="font-italic">Note: This is a testing application. Please open console for debugging.</p>
    <div>
      <span :style="{ marginRight: '20px' }">verifier:</span>
      <select v-model="selectedVerifier">
        <option :key="login" v-for="login in Object.keys(verifierMap)" :value="login">{{ verifierMap[login].name }}</option>
      </select>
    </div>
    <div :style="{ marginTop: '20px' }" v-if="selectedVerifier === 'passwordless'">
      <input type="email" v-model="loginHint" placeholder="Enter your email" />
    </div>

    <div :style="{ marginTop: '20px' }">
      <input type="checkbox" id="mocked" v-model="mocked" />
      <label for="mocked">Mocked Login</label>
    </div>

    <div :style="{ marginTop: '20px' }">
      <h4>Login and resets</h4>
      <button @click="triggerLogin">Login with Torus and initialize tkey</button>
      <button @click="_initializeNewKey">Create new tkey</button>
      <button @click="reconstructKey">Reconstuct tkey</button>
      <button @click="getKeyDetails">Get tkey details</button>
      <button @click="getSDKObject">Get tkey object</button>
      <br />
      <h4>Add and removing shares</h4>
      <div :style="{ margin: '20px' }">
        <input v-model="answer" placeholder="enter your answer" />
      </div>
      <button @click="generateNewShareWithSecurityQuestions">Create a new password</button>
      <button @click="inputShareFromSecurityQuestions">input password share (for reconstructKey)</button>
      <!-- <button @click="generateNewShare">generateNewShare</button> -->
      <br />
      <h4>Share Transer</h4>
      <button @click="checkShareRequests">Check share requests</button>
      <button @click="requestShare">Request Share</button>
      <button @click="approveShareRequest">Approve request</button>
      <button @click="resetShareRequests">Reset share request store</button>
    </div>
    <div id="console">
      <p></p>
    </div>
  </div>
</template>

<script>
import ThresholdKey from "@tkey/default";
import TorusServiceProvider from "@tkey/service-provider-torus";
import TorusStorageLayer from "@tkey/storage-layer-torus";
import ServiceProviderBase from "@tkey/service-provider-base";
import WebStorageModule from "@tkey/web-storage";
import SecurityQuestionsModule from "@tkey/security-questions";
import ShareTransferModule from "@tkey/share-transfer";

// import ServiceProviderBase from '../../../src/serviceProvider/ServiceProviderBase';

const GOOGLE = "google";
const FACEBOOK = "facebook";
const REDDIT = "reddit";
const DISCORD = "discord";
const TWITCH = "twitch";
const GITHUB = "github";
const APPLE = "apple";
const LINKEDIN = "linkedin";
const TWITTER = "twitter";
const WEIBO = "weibo";
const LINE = "line";
const EMAIL_PASSWORD = "email_password";
const PASSWORDLESS = "passwordless";
const HOSTED_EMAIL_PASSWORDLESS = "hosted_email_passwordless";
const HOSTED_SMS_PASSWORDLESS = "hosted_sms_passwordless";

const AUTH_DOMAIN = "https://torus-test.auth0.com";

export default {
  name: "App",
  data() {
    return {
      torusdirectsdk: undefined,
      selectedVerifier: "google",
      loginHint: "",
      mocked: true,
      answer: "",
      verifierMap: {
        [GOOGLE]: {
          name: "Google",
          typeOfLogin: "google",
          clientId: "221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com",
          verifier: "google-lrc"
        },
        [FACEBOOK]: { name: "Facebook", typeOfLogin: "facebook", clientId: "617201755556395", verifier: "facebook-lrc" },
        [REDDIT]: { name: "Reddit", typeOfLogin: "reddit", clientId: "YNsv1YtA_o66fA", verifier: "torus-reddit-test" },
        [TWITCH]: { name: "Twitch", typeOfLogin: "twitch", clientId: "f5and8beke76mzutmics0zu4gw10dj", verifier: "twitch-lrc" },
        [DISCORD]: { name: "Discord", typeOfLogin: "discord", clientId: "682533837464666198", verifier: "discord-lrc" },
        [EMAIL_PASSWORD]: {
          name: "Email Password",
          typeOfLogin: "email_password",
          clientId: "sqKRBVSdwa4WLkaq419U7Bamlh5vK1H7",
          verifier: "torus-auth0-email-password"
        },
        [PASSWORDLESS]: {
          name: "Passwordless",
          typeOfLogin: "passwordless",
          clientId: "P7PJuBCXIHP41lcyty0NEb7Lgf7Zme8Q",
          verifier: "torus-auth0-passwordless"
        },
        [APPLE]: { name: "Apple", typeOfLogin: "apple", clientId: "m1Q0gvDfOyZsJCZ3cucSQEe9XMvl9d9L", verifier: "torus-auth0-apple-lrc" },
        [GITHUB]: { name: "Github", typeOfLogin: "github", clientId: "PC2a4tfNRvXbT48t89J5am0oFM21Nxff", verifier: "torus-auth0-github-lrc" },
        [LINKEDIN]: { name: "Linkedin", typeOfLogin: "linkedin", clientId: "59YxSgx79Vl3Wi7tQUBqQTRTxWroTuoc", verifier: "torus-auth0-linkedin-lrc" },
        [TWITTER]: { name: "Twitter", typeOfLogin: "twitter", clientId: "A7H8kkcmyFRlusJQ9dZiqBLraG2yWIsO", verifier: "torus-auth0-twitter-lrc" },
        [WEIBO]: { name: "Weibo", typeOfLogin: "weibo", clientId: "dhFGlWQMoACOI5oS5A1jFglp772OAWr1", verifier: "torus-auth0-weibo-lrc" },
        [LINE]: { name: "Line", typeOfLogin: "line", clientId: "WN8bOmXKNRH1Gs8k475glfBP5gDZr9H1", verifier: "torus-auth0-line-lrc" },
        [HOSTED_EMAIL_PASSWORDLESS]: {
          name: "Hosted Email Passwordless",
          typeOfLogin: "jwt",
          clientId: "P7PJuBCXIHP41lcyty0NEb7Lgf7Zme8Q",
          verifier: "torus-auth0-passwordless"
        },
        [HOSTED_SMS_PASSWORDLESS]: {
          name: "Hosted SMS Passwordless",
          typeOfLogin: "jwt",
          clientId: "nSYBFalV2b1MSg5b2raWqHl63tfH3KQa",
          verifier: "torus-auth0-sms-passwordless"
        }
      }
    };
  },
  computed: {
    loginToConnectionMap() {
      return {
        [EMAIL_PASSWORD]: { domain: AUTH_DOMAIN },
        [PASSWORDLESS]: { domain: AUTH_DOMAIN, login_hint: this.loginHint },
        [HOSTED_EMAIL_PASSWORDLESS]: { domain: AUTH_DOMAIN, verifierIdField: "name", connection: "", isVerifierIdCaseSensitive: false },
        [HOSTED_SMS_PASSWORDLESS]: { domain: AUTH_DOMAIN, verifierIdField: "name", connection: "" },
        [APPLE]: { domain: AUTH_DOMAIN },
        [GITHUB]: { domain: AUTH_DOMAIN },
        [LINKEDIN]: { domain: AUTH_DOMAIN },
        [TWITTER]: { domain: AUTH_DOMAIN },
        [WEIBO]: { domain: AUTH_DOMAIN },
        [LINE]: { domain: AUTH_DOMAIN }
      };
    }
  },
  methods: {
    getKeyDetails() {
      console.log(this.tbsdk.getKeyDetails());
      return this.tbsdk.getKeyDetails();
    },
    getLatestPolynomialDetails() {
      const metadata = this.tbSDK.getMetadata();
      let latestPolynomial = metadata.getLatestPublicPolynomial();
      let latestPolynomialId = latestPolynomial.getPolynomialID();
      let indexes = metadata.getShareIndexesForPolynomial(latestPolynomialId);
      console.log(latestPolynomial, latestPolynomialId, indexes);
    },
    getSDKObject() {
      console.log(this.tbsdk);
    },
    passwordValidation(v) {
      return v.length >= 10;
      // return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\dA-Za-z]).\S{10,}$/.test(v)
    },
    async initializeAndReconstruct() {
      try {
        const initializedDetails = await this.tbsdk.initialize();
        console.log(initializedDetails);
        // console.log(initializedDetails.shareDescriptions[2].length)

        let shareDesc = Object.assign({}, initializedDetails.shareDescriptions);
        Object.keys(shareDesc).map(el => {
          shareDesc[el] = shareDesc[el].map(jl => {
            return JSON.parse(jl);
          });
        });

        // Check different types of shares from metadata. This helps in making UI decisions (About what kind of shares to ask from users)
        // Sort the share descriptions with priority order
        let priorityOrder = ["webStorage", "securityQuestions"];

        let tempSD = Object.values(shareDesc)
          .flatMap(x => x)
          .sort((a, b) => {
            return priorityOrder.indexOf(a.module) - priorityOrder.indexOf(b.module);
          });

        if (tempSD.length === 0 && requiredShares > 0) {
          throw new Error("No share descriptions available. New key assign might be required or contact support");
        }
        let requiredShares = initializedDetails.requiredShares;
        while (requiredShares > 0 && tempSD.length > 0) {
          let currentPriority = tempSD.shift();
          if (currentPriority.module === "webStorage") {
            try {
              await this.tbsdk.modules.webStorage.inputShareFromWebStorage();
              requiredShares--;
            } catch (err) {
              console.log("Couldn't find on device share");
            }
          } else if (currentPriority.module === "securityQuestions") {
            // default to password for now
            throw "Password required";
          }

          if (tempSD.length === 0 && requiredShares > 0) {
            throw "new key assign required";
          }
        }

        console.log(this.tbsdk);

        const key = await this.tbsdk.reconstructKey();
        // await this.tbsdk._initializeNewKey(undefined, true)
        console.log(key.privKey.toString("hex"));
        this.console(key);

        // this.console(initializedDetails);
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async triggerLogin() {
      try {
        await this.initTkey();

        // console.log(this.tbsdk, this.tbsdk.serviceProvider, this.tbsdk.serviceProvider.__proto__ )
        if (!this.tbsdk.serviceProvider) return;
        if (!this.mocked) {
          const jwtParams = this.loginToConnectionMap[this.selectedVerifier] || {};
          const { typeOfLogin, clientId, verifier } = this.verifierMap[this.selectedVerifier];
          // await this.tbsdk.serviceProvider.triggerLogin({
          //   typeOfLogin,
          //   verifier,
          //   clientId,
          //   jwtParams
          // });

          await this.tbsdk.serviceProvider.triggerHybridAggregateLogin({
            singleLogin: {
              typeOfLogin,
              verifier,
              clientId,
              jwtParams
            },
            aggregateLoginParams: {
              aggregateVerifierType: "single_id_verifier",
              verifierIdentifier: "tkey-google",
              subVerifierDetailsArray: [
                {
                  clientId: "221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com",
                  typeOfLogin: "google",
                  verifier: "torus"
                }
              ]
            }
          });
        }

        await this.initializeAndReconstruct();
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async generateNewShareWithSecurityQuestions() {
      try {
        if (!this.passwordValidation(this.answer)) {
          this.console("Minimum length 10 characters");
          throw "Minimum length 10 characters";
        }
        await this.tbsdk.modules.securityQuestions.generateNewShareWithSecurityQuestions(this.answer, "whats your password?");
        this.console("succeeded generateNewShareWithSecurityQuestions");
        console.log(this.tbsdk.getKeyDetails());
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async checkShareRequests() {
      try {
        const result = await this.tbsdk.modules.shareTransfer.getShareTransferStore();
        const requests = await this.tbsdk.modules.shareTransfer.lookForRequests();
        console.log(result, requests);
      } catch (err) {
        console.log(err);
      }
    },
    async resetShareRequests() {
      try {
        await this.tbsdk.modules.shareTransfer.resetShareTransferStore();
        this.console("Reset share transfer store successfully");
      } catch (err) {
        console.log(err);
      }
    },
    async approveShareRequest() {
      try {
        const result = await this.tbsdk.modules.shareTransfer.getShareTransferStore();
        const requests = await this.tbsdk.modules.shareTransfer.lookForRequests();
        let shareToShare;
        try {
          shareToShare = await this.tbsdk.modules.webStorage.getDeviceShare();
        } catch (err) {
          console.error("No on device share found. Generating a new share");
          const newShare = await this.tbsdk.generateNewShare();
          shareToShare = newShare.newShareStores[newShare.newShareIndex.toString("hex")];
        }
        console.log(result, requests, this.tbsdk);

        await this.tbsdk.modules.shareTransfer.approveRequest(requests[0], shareToShare);
        // await this.tbsdk.modules.shareTransfer.deleteShareTransferStore(requests[0]) // delete old share requests
        this.console("approved");
      } catch (err) {
        console.error(err);
      }
    },
    async requestShare() {
      try {
        const result = await this.tbsdk.modules.shareTransfer.requestNewShare();
        console.log(result);
      } catch (err) {
        console.error(err);
      }
    },
    async reconstructKey() {
      try {
        let key = await this.tbsdk.reconstructKey();
        this.console("private key, " + JSON.stringify(key));
        console.log(JSON.stringify(key), this.tbsdk.getKeyDetails());
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async inputShareFromSecurityQuestions() {
      try {
        if (!this.passwordValidation(this.answer)) {
          this.console("Minimum length 10 characters");
          throw "Minimum length 10 characters";
        }
        await this.tbsdk.modules.securityQuestions.inputShareFromSecurityQuestions(this.answer, "whats your password?");
        this.console("succeded inputShareFromSecurityQuestions");
        console.log(this.tbsdk.getKeyDetails());
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async generateNewShare() {
      try {
        const res = await this.tbsdk.generateNewShare();
        console.log(res);
        this.console(res);
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async _initializeNewKey() {
      try {
        await this.initTkey();
        if (!this.mocked) await this.triggerLogin();
        const res = await this.tbsdk._initializeNewKey({ initializeModules: true });
        this.console(res);
        console.log("new tkey", res);
      } catch (error) {
        console.error(error, "caught");
      }
    },
    async initTkey() {
      const directParams = {
        baseUrl: `${location.origin}/serviceworker`,
        enableLogging: true,
        proxyContractAddress: "0x4023d2a0D330bF11426B12C6144Cfb96B7fa6183", // details for test net
        network: "testnet" // details for test net
      };
      const webStorageModule = new WebStorageModule();
      const securityQuestionsModule = new SecurityQuestionsModule();
      const shareTransferModule = new ShareTransferModule();

      let serviceProvider;
      if (this.mocked) {
        serviceProvider = new ServiceProviderBase({ postboxKey: "f1f02ee186749cfe1ef8f957fc3d7a5b7128f979bacc10ab3b2a811d4f990852" });
      } else {
        serviceProvider = new TorusServiceProvider({ directParams });
      }
      const storageLayer = new TorusStorageLayer({ hostUrl: "https://metadata.tor.us", serviceProvider: serviceProvider });
      const tbsdk = new ThresholdKey({
        serviceProvider: serviceProvider,
        storageLayer,
        modules: { webStorage: webStorageModule, securityQuestions: securityQuestionsModule, shareTransfer: shareTransferModule }
      });
      this.tbsdk = tbsdk;
      this.torusdirectsdk = tbsdk.serviceProvider;

      if (!this.mocked) await tbsdk.serviceProvider.init({ skipSw: false });
    },
    console(text) {
      document.querySelector("#console>p").innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
    }
  },
  async mounted() {
    try {
      await this.initTkey();
    } catch (error) {
      console.error(error, "mounted caught");
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#console {
  border: 1px solid black;
  height: 80px;
  padding: 2px;
  bottom: 10px;
  position: absolute;
  text-align: left;
  width: calc(100% - 20px);
  border-radius: 5px;
}
#console::before {
  content: "Console :";
  position: absolute;
  top: -20px;
  font-size: 12px;
}
#console > p {
  margin: 0.5em;
  word-wrap: break-word;
}
#font-italic {
  font-style: italic;
}
button {
  margin: 0 10px 10px 0;
}
</style>
