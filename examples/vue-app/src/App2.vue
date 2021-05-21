<template>
  <div id="app">
    <p>Note: This is a testing application. Please open console for debugging.</p>
    <div>
      <input type="checkbox" id="is-mocked" v-model="isMocked" />
      <label for="is-mocked">Mock login</label>
    </div>
    <div v-if="!isMocked" :style="{ marginTop: '16px' }">
      <span :style="{ marginRight: '0.5em' }">Verifier:</span>
      <select v-model="selectedVerifier">
        <option :key="login" v-for="login in Object.keys(verifiers)" :value="login">{{ verifiers[login].name }}</option>
      </select>
    </div>
    <div v-if="!isMocked && selectedVerifier === 'passwordless'" :style="{ marginTop: '16px' }">
      <input type="email" v-model="loginHint" placeholder="Enter your email" />
    </div>
    <div :style="{ marginTop: '16px' }">
      <h4>Login and resets</h4>
      <button v-if="!isMocked" @click="login">Login and initialize with Torus</button>
      <button @click="_initializeNewKey">Initialize new key</button>
      <button @click="reconstructKey">Reconstuct key</button>
      <button @click="getKeyDetails">Get key details</button>
      <button @click="getSDKObject">Get SDK object</button>
      <br />
    </div>
    <div id="console">
      <p>{{ consoleOutput }}</p>
    </div>
  </div>
</template>

<script>
import ThresholdKey from "@tkey/default";
import TorusStorageLayer from "@tkey/storage-layer-torus";
import BaseServiceProvider from "@tkey/service-provider-base";
import TorusServiceProvider from "@tkey/service-provider-torus";
import WebStorageModule from "@tkey/web-storage";

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
const AGGREGATE_LOGIN = {
  aggregateVerifierType: "single_id_verifier",
  verifierIdentifier: "tkey-google",
  subVerifierDetailsArray: [
    {
      clientId: "221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com",
      typeOfLogin: "google",
      verifier: "torus",
    },
  ],
};

export default {
  name: "App",
  data() {
    return {
      consoleOutput: "",
      isMocked: true,
      loginHint: "",
      selectedVerifier: "google",
      verifiers: {
        [GOOGLE]: {
          name: "Google",
          typeOfLogin: "google",
          clientId: "221898609709-obfn3p63741l5333093430j3qeiinaa8.apps.googleusercontent.com",
          verifier: "google-lrc",
        },
        [FACEBOOK]: { name: "Facebook", typeOfLogin: "facebook", clientId: "617201755556395", verifier: "facebook-lrc" },
        [REDDIT]: { name: "Reddit", typeOfLogin: "reddit", clientId: "YNsv1YtA_o66fA", verifier: "torus-reddit-test" },
        [TWITCH]: { name: "Twitch", typeOfLogin: "twitch", clientId: "f5and8beke76mzutmics0zu4gw10dj", verifier: "twitch-lrc" },
        [DISCORD]: { name: "Discord", typeOfLogin: "discord", clientId: "682533837464666198", verifier: "discord-lrc" },
        [EMAIL_PASSWORD]: {
          name: "Email Password",
          typeOfLogin: "email_password",
          clientId: "sqKRBVSdwa4WLkaq419U7Bamlh5vK1H7",
          verifier: "torus-auth0-email-password",
        },
        [PASSWORDLESS]: {
          name: "Passwordless",
          typeOfLogin: "passwordless",
          clientId: "P7PJuBCXIHP41lcyty0NEb7Lgf7Zme8Q",
          verifier: "torus-auth0-passwordless",
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
          verifier: "torus-auth0-passwordless",
        },
        [HOSTED_SMS_PASSWORDLESS]: {
          name: "Hosted SMS Passwordless",
          typeOfLogin: "jwt",
          clientId: "nSYBFalV2b1MSg5b2raWqHl63tfH3KQa",
          verifier: "torus-auth0-sms-passwordless",
        },
      },
    };
  },
  computed: {
    loginConnections() {
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
        [LINE]: { domain: AUTH_DOMAIN },
      };
    },
  },
  watch: {
    async isMocked() {
      await this.init();
    },
  },
  methods: {
    async init() {
      this.tKey = null;

      const serviceProvider = this.isMocked
        ? new BaseServiceProvider({ postboxKey: "f1f02ee186749cfe1ef8f957fc3d7a5b7128f979bacc10ab3b2a811d4f990852" })
        : new TorusServiceProvider({
            directParams: {
              baseUrl: `${location.origin}/serviceworker`,
              enableLogging: true,
              proxyContractAddress: "0x4023d2a0D330bF11426B12C6144Cfb96B7fa6183", // details for test net
              network: "testnet", // details for test net
            },
          });
      if (!this.isMocked) {
        await serviceProvider.init({ skipSw: false });
      }

      const storageLayer = new TorusStorageLayer({ hostUrl: "http://localhost:5051", serviceProvider });
      const webStorage = new WebStorageModule();

      this.tKey = new ThresholdKey({
        serviceProvider,
        storageLayer,
        modules: { webStorage },
      });
    },
    async login() {
      if (this.isMocked) return;
      if (!this.tKey) return;

      const jwtParams = this.loginConnections[this.selectedVerifier] || {};
      const { typeOfLogin, clientId, verifier } = this.verifiers[this.selectedVerifier];

      await this.tKey.serviceProvider.triggerHybridAggregateLogin({
        singleLogin: {
          typeOfLogin,
          verifier,
          clientId,
          jwtParams,
        },
        aggregateLoginParams: AGGREGATE_LOGIN,
      });

      const details = await this.tKey.initialize();

      let shareDescriptions = Object.assign({}, details.shareDescriptions);
      Object.keys(shareDescriptions).map((key) => {
        shareDescriptions[key] = shareDescriptions[key].map((it) => JSON.parse(it));
      });

      let priority = ["webStorage", "securityQuestions"];
      shareDescriptions = Object.values(shareDescriptions)
        .flatMap((x) => x)
        .sort((a, b) => priority.indexOf(a.module) - priority.indexOf(b.module));

      let requiredShares = details.requiredShares;
      if (shareDescriptions.length === 0 && requiredShares > 0) {
        throw new Error("No share descriptions available. New key assign might be required or contact support.");
      }

      while (requiredShares > 0 && shareDescriptions.length > 0) {
        let curr = shareDescriptions.shift();
        if (curr.module === "webStorage") {
          try {
            await this.tKey.modules.webStorage.inputShareFromWebStorage();
            requiredShares--;
          } catch (err) {
            console.log("Couldn't find on device share.", err);
          }
        } else if (curr.module === "securityQuestions") {
          throw new Error("Password required");
        }

        if (shareDescriptions.length === 0 && requiredShares > 0) {
          throw new Error("New key assign is required.");
        }
      }

      await this.reconstructKey();
    },
    async _initializeNewKey() {
      this.console(await this.tKey._initializeNewKey({ initializeModules: true }));
    },
    async reconstructKey() {
      this.console(await this.tKey.reconstructKey());
    },
    async getKeyDetails() {
      this.console(await this.tKey.getKeyDetails());
    },
    getSDKObject() {
      this.console(this.tKey);
    },
    console(output) {
      this.consoleOutput = typeof output === "string" ? output : JSON.stringify(output, null, 2);
      console.log(output);
    },
  },
  async mounted() {
    await this.init();
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#console {
  position: relative;
  border: 1px solid black;
  padding: 2px;
  margin-top: 36px;
  margin-left: 6px;
  width: calc(100% - 20px);
  min-height: 64px;
  border-radius: 5px;
  text-align: left;
}
#console::before {
  content: "Console";
  position: absolute;
  top: -20px;
  font-size: 12px;
}
#console > p {
  margin: 0.5em;
  word-wrap: break-word;
}
button {
  margin: 0 0.5em 0.5em 0;
}
</style>
