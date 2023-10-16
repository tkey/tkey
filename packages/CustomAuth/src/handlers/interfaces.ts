import { INetworkConfig, Network } from "../utils/blockchain";
import { AGGREGATE_VERIFIER_TYPE, LOGIN_TYPE, TORUS_METHOD_TYPE, UX_MODE_TYPE } from "../utils/enums";

export type TorusGenericObject = {
  [key: string]: string;
};

export type PopupResponse = {
  hashParams: { access_token: string; id_token?: string };
  instanceParams: TorusGenericObject;
};

export interface Auth0UserInfo {
  picture: string;
  email: string;
  name: string;
  sub: string;
  nickname: string;
}

export interface ExtraParams {
  [key: string]: unknown;
}

export type WebAuthnExtraParams = {
  signature?: string;
  clientDataJSON?: string;
  authenticatorData?: string;
  publicKey?: string;
  challenge?: string;
  rpOrigin?: string;
  credId?: string;
  transports?: AuthenticatorTransport[];
};
export interface TorusVerifierResponse {
  email: string;
  name: string;
  profileImage: string;
  aggregateVerifier?: string;
  verifierId: string;
  typeOfLogin: LOGIN_TYPE;
  ref?: string;
  extraVerifierParams?: WebAuthnExtraParams;
}

export interface TorusSubVerifierInfo {
  verifier: string;
  idToken: string;
  extraVerifierParams?: WebAuthnExtraParams;
}

export interface LoginWindowResponse {
  accessToken?: string;
  idToken?: string;
  ref?: string;
  extraParams?: string;
  extraParamsPassed?: string;
  state?: TorusGenericObject;
}

export interface ILoginHandler {
  clientId: string;
  nonce: string;
  finalURL: URL;
  getUserInfo(params: LoginWindowResponse): Promise<TorusVerifierResponse>;
  handleLoginWindow(params: { locationReplaceOnRedirect?: boolean; popupFeatures?: string }): Promise<LoginWindowResponse>;
}

export interface TorusKeyPub {
  pubKey?: {
    pub_key_X: string;
    pub_key_Y: string;
  };
}

export interface TorusKey extends TorusKeyPub {
  privateKey: string;
}

export interface TorusAggregateVerifierResponse {
  userInfo: (TorusVerifierResponse & LoginWindowResponse)[];
}

export interface TorusSingleVerifierResponse {
  userInfo?: TorusVerifierResponse & LoginWindowResponse;
}

export type TorusLoginResponse = TorusSingleVerifierResponse & TorusKey;
export type TorusAggregateLoginResponse = TorusAggregateVerifierResponse & TorusKey;
export type TorusHybridAggregateLoginResponse = { singleLogin: TorusLoginResponse; aggregateLogins: TorusKey[] };

export interface CustomAuthArgs {
  /**
   * baseUrl , along with redirectPathName is used to construct the uri of page
   * where user will be redirected after login.
   *
   * @remarks
   * Redirect Uri for OAuth is `baseUrl`+`redirectPathName` which means
   * that you must specify `baseUrl`+`redirectPathName` as redirect_uri at verifier's
   * interface.
   *
   * Torus Direct SDK installs a service worker relative to baseUrl to capture
   * the auth redirect at `redirectPathName` path.
   *
   * For ex: While using serviceworker if baseUrl is "http://localhost:3000/serviceworker" and
   * redirectPathName is 'redirect' (which is default)
   * then user will be redirected to http://localhost:3000/serviceworker/redirect page after login
   * where service worker will capture the results and send it back to original window where login
   * was initiated.
   *
   * Using serviceworker is optional, you can skip it by passing `skipSw` param
   * in init function
   *
   * Use of serviceworker is recommended if you are using popup uxMode or
   * for browsers where service workers are not supported or if you wish to not use
   * service workers, create and serve redirect page (i.e redirect.html file which is
   * available in serviceworker folder of this package)
   *
   * In redirect uxMode, you don't have to use serviceworker or redirect.html file.
   * You can get login result by calling `getRedirectResult` on redirected page mount.
   *
   * For ex: if baseUrl is "http://localhost:3000" and `redirectPathName` is 'auth'
   * then user will be redirected to http://localhost:3000/auth page after login
   * where you can get login result by calling `getRedirectResult` on redirected page mount.
   *
   * Please refer to examples https://github.com/torusresearch/customauth/tree/master/examples
   * for more understanding.
   *
   */
  baseUrl: string;

  /**
   * Specify a custom metadata host
   * @defaultValue https://metadata.social-login.orai.io
   */
  metadataUrl?: string;

  /**
   * Torus Network to target options: mainnet | testnet | cyan | aqua
   * @defaultValue mainnet
   */
  network?: Network;

  /**
   * Network Url to read blockchain data from (eg: infura url)
   */
  networkUrl?: string;

  /**
   * This option is used to specify whether to enable logging
   *
   * @defaultValue false
   */
  enableLogging?: boolean;

  /**
   * Use one key features
   *
   * @defaultValue false
   */
  enableOneKey?: boolean;

  /**
   * For chrome extensions, the general methods for capturing auth redirects don't work.
   * So, we redirect to the window which opens the auth window.
   *
   * @defaultValue false
   */
  redirectToOpener?: boolean;

  /**
   * This option is used to specify the url path where user will be
   * redirected after login. Redirect Uri for OAuth is baseUrl/redirectPathName.
   *
   *
   * @defaultValue redirect
   *
   * @remarks
   * At verifier's interface (where you obtain client id), please use baseUrl/redirectPathName
   * as the redirect_uri
   *
   * Torus Direct SDK installs a service worker relative to baseUrl to capture
   * the auth redirect at `redirectPathName` path.
   *
   * For ex: While using serviceworker if `baseUrl` is "http://localhost:3000/serviceworker" and
   * `redirectPathName` is 'redirect' (which is default)
   * then user will be redirected to http://localhost:3000/serviceworker/redirect page after login
   * where service worker will capture the results and send it back to original window where login
   * was initiated.
   *
   * For browsers where service workers are not supported or if you wish to not use
   * service workers,create and serve redirect page (i.e redirect.html file which is
   * available in serviceworker folder of this package)
   *
   * If you are using redirect uxMode, you can get the results directly on your `redirectPathName`
   * path using `getRedirectResult` function.
   *
   * For ex: if baseUrl is "http://localhost:3000" and `redirectPathName` is 'auth'
   * then user will be redirected to http://localhost:3000/auth page after login
   * where you can get login result by calling `getRedirectResult` on redirected page mount.
   *
   * Please refer to examples https://github.com/torusresearch/customauth/tree/master/examples
   * for more understanding.
   *
   */
  redirectPathName?: string;

  /**
   * API Key for torus to enable higher access limits
   *
   */
  apiKey?: string;
  /**
   * Two uxModes are supported:-
   * - `'popup'`: In this uxMode, a popup will be shown to user for login.
   * - `'redirect'`: In this uxMode, user will be redirected to a new window tab for login.
   *
   * @defaultValue `'popup'`
   * @remarks
   *
   * Use of `'REDIRECT'` mode is recommended in browsers where popups might get blocked.
   */
  uxMode?: UX_MODE_TYPE;

  /**
   * Whether to replace the url hash/query params from OAuth at the end of the redirect flow
   *
   * @defaultValue false
   */
  locationReplaceOnRedirect?: boolean;

  /**
   * Features of popup window. Please check https://developer.mozilla.org/en-US/docs/Web/API/Window/open#window_features
   * for further documentation.
   */
  popupFeatures?: string;
  /**
   * Specify a custom storage server url
   * @defaultValue https://broadcast-server.tor.us
   */
  storageServerUrl?: string;
  /**
   * Specify the wasm interface of blsdkg
   * */
  blsdkg?: {
    init: any;
    interpolate: (indexes: Uint8Array[], shares: Uint8Array[]) => Uint8Array;
    get_pk: (privKey: Uint8Array) => Uint8Array;
  };

  /**
   * Override the default network config in blockchain configuration
   * */
  networkConfig?: Partial<INetworkConfig>;
}

export interface InitParams {
  /**
   * skips the installation / check for service worker
   * @defaultValue false
   */
  skipSw?: boolean;

  /**
   * skips the init function
   * @defaultValue false
   */
  skipInit?: boolean;

  /**
   * skips the prefetching of redirect url
   * @defaultValue false
   *
   */
  skipPrefetch?: boolean;
}

// REGION: AUTH0 PARAMS
export interface BaseLoginOptions {
  /**
   * If you need to send custom parameters to the Authorization Server,
   * make sure to use the original parameter name.
   */
  [key: string]: unknown;
  /**
   * - `'page'`: displays the UI with a full page view
   * - `'popup'`: displays the UI with a popup window
   * - `'touch'`: displays the UI in a way that leverages a touch interface
   * - `'wap'`: displays the UI with a "feature phone" type interface
   */
  display?: "page" | "popup" | "touch" | "wap" | string;
  /**
   * - `'none'`: do not prompt user for login or consent on reauthentication
   * - `'login'`: prompt user for reauthentication
   * - `'consent'`: prompt user for consent before processing request
   * - `'select_account'`: prompt user to select an account
   */
  prompt?: "none" | "login" | "consent" | "select_account" | string;
  /**
   * Maximum allowable elasped time (in seconds) since authentication.
   * If the last time the user authenticated is greater than this value,
   * the user must be reauthenticated.
   */
  max_age?: string | number;
  /**
   * The space-separated list of language tags, ordered by preference.
   * For example: `'fr-CA fr en'`.
   */
  ui_locales?: string;
  /**
   * Previously issued ID Token.
   */
  id_token_hint?: string;
  /**
   * The user's email address or other identifier. When your app knows
   * which user is trying to authenticate, you can provide this parameter
   * to pre-fill the email box or select the right session for sign-in.
   *
   * This currently only affects the classic Lock experience.
   */
  login_hint?: string;
  acr_values?: string;
  /**
   * The default scope to be used on authentication requests.
   * The defaultScope defined in the Auth0Client is included
   * along with this scope
   */
  scope?: string;
  /**
   * The default audience to be used for requesting API access.
   */
  audience?: string;
  /**
   * The name of the connection configured for your application.
   * If null, it will redirect to the Auth0 Login Page and show
   * the Login Widget.
   */
  connection?: string;
}

export interface Auth0ClientOptions extends BaseLoginOptions {
  /**
   * Your Auth0 account domain such as `'example.auth0.com'`,
   * `'example.eu.auth0.com'` or , `'example.mycompany.com'`
   * (when using [custom domains](https://auth0.com/docs/custom-domains))
   */
  domain?: string;
  /**
   * The Client ID found on your Application settings page
   */
  client_id?: string;
  /**
   * The default URL where Auth0 will redirect your browser to with
   * the authentication result. It must be whitelisted in
   * the "Allowed Callback URLs" field in your Auth0 Application's
   * settings. If not provided here, it should be provided in the other
   * methods that provide authentication.
   */
  redirect_uri?: string;
  /**
   * The value in seconds used to account for clock skew in JWT expirations.
   * Typically, this value is no more than a minute or two at maximum.
   * Defaults to 60s.
   */
  leeway?: number;

  /**
   * The field in jwt token which maps to verifier id
   */
  verifierIdField?: string;

  /**
   * Whether the verifier id field is case sensitive
   * @defaultValue true
   */
  isVerifierIdCaseSensitive?: boolean;

  id_token?: string;

  access_token?: string;
  /**
   * The route for user info endpoint. This will be padded to domain
   * @defaultValue userinfo
   * */
  user_info_route?: string;
}

export interface SubVerifierDetails {
  typeOfLogin: LOGIN_TYPE;
  verifier: string;
  clientId: string;
  jwtParams?: Auth0ClientOptions;
  hash?: string;
  queryParameters?: TorusGenericObject;
  customState?: TorusGenericObject;
  idToken?: string;
  accessToken?: string;
}

export interface CreateHandlerParams {
  typeOfLogin: LOGIN_TYPE;
  clientId: string;
  redirect_uri: string;
  uxMode?: UX_MODE_TYPE;
  redirectToOpener?: boolean;
  jwtParams?: Auth0ClientOptions;
  customState?: TorusGenericObject;
}

export interface RedirectResultParams {
  replaceUrl?: boolean;
  clearLoginDetails?: boolean;
}

export type SingleLoginParams = SubVerifierDetails;

export interface AggregateLoginParams {
  aggregateVerifierType: AGGREGATE_VERIFIER_TYPE;
  verifierIdentifier: string;
  subVerifierDetailsArray: SubVerifierDetails[];
}

export interface HybridAggregateLoginParams {
  singleLogin: SubVerifierDetails;
  aggregateLoginParams: AggregateLoginParams;
}

export type LoginDetails = { method: TORUS_METHOD_TYPE; args: SingleLoginParams | AggregateLoginParams | HybridAggregateLoginParams };

export interface RedirectResult {
  method: TORUS_METHOD_TYPE;
  result?: TorusLoginResponse | TorusAggregateLoginResponse | TorusHybridAggregateLoginResponse | unknown;
  error?: string;
  state: Record<string, unknown>;
  hashParameters?: Record<string, string>;
  args: SingleLoginParams | AggregateLoginParams | HybridAggregateLoginParams;
}

export interface MapNewVerifierParams {
  typeOfLogin: LOGIN_TYPE;
  signature?: string;
  idToken: string;
  verifier?: string;
  verifierId?: string;
  newVerifier: string;
  newVerifierId: string;
}
