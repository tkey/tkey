import ChromeExtensionStorageModule from "./src/chromeStorage/ChromeExtensionStorageModule";
import ThresholdKey from "./src/index";
import PrivateKeyModule from "./src/privateKeys/PrivateKeys";
import SECP256K1Format from "./src/privateKeys/SECP256K1Format";
import SecurityQuestionsModule from "./src/securityQuestions/SecurityQuestionsModule";
import MetamaskSeedPhraseFormat from "./src/seedPhrase/MetamaskSeedPhraseFormat";
import SeedPhraseModule from "./src/seedPhrase/SeedPhrase";
import ServiceProviderBase from "./src/serviceProvider/ServiceProviderBase";
import TorusServiceProvider from "./src/serviceProvider/TorusServiceProvider";
import ShareTransferModule from "./src/shareTransfer/ShareTransferModule";
import TorusStorageLayer from "./src/storage-layer";
import WebStorageModule from "./src/webStorage/WebStorageModule";

export default ThresholdKey;

export {
  TorusServiceProvider,
  ServiceProviderBase,
  WebStorageModule,
  ChromeExtensionStorageModule,
  SecurityQuestionsModule,
  TorusStorageLayer,
  ShareTransferModule,
  SeedPhraseModule,
  MetamaskSeedPhraseFormat,
  PrivateKeyModule,
  SECP256K1Format,
};
