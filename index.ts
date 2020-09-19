import ChromeExtensionStorageModule from "./src/chromeStorage/ChromeExtensionStorageModule";
import ThresholdKey from "./src/index";
import SecurityQuestionsModule from "./src/securityQuestions/SecurityQuestionsModule";
import ServiceProviderBase from "./src/serviceProvider/ServiceProviderBase";
import TorusServiceProvider from "./src/serviceProvider/TorusServiceProvider";
import ShareTransferModule from "./src/shareTransfer/shareTransferModule";
import TorusStorageLayer from "./src/storage-layer";
import SeedPhraseModule from "./src/tkeyModule/SeedPhrase/SeedPhrase";
import TkeyModule from "./src/tkeyModule/TkeyModule";
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
  TkeyModule,
  SeedPhraseModule,
};
