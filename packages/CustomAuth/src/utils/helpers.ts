import Bowser from "bowser";

import { Auth0UserInfo, TorusGenericObject } from "../handlers/interfaces";
import { LOGIN, LOGIN_TYPE, REDIRECT_PARAMS_STORAGE_METHOD_TYPE } from "./enums";
import log from "./loglevel";
interface CustomMessageEvent extends MessageEvent {
  error: string;
}

interface EventListener {
  (evt: CustomMessageEvent): void;
}

type EmitterType = { addEventListener(type: string, handler: EventListener): void; removeEventListener(type: string, handler: EventListener): void };

export function eventToPromise<T>(emitter: EmitterType): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const handler = (ev: CustomMessageEvent) => {
      const { error = "", data } = ev;
      emitter.removeEventListener("message", handler);
      if (error) return reject(new Error(error));
      return resolve(data as T);
    };
    emitter.addEventListener("message", handler);
  });
}

// These are the connection names used by auth0
export const loginToConnectionMap = {
  [LOGIN.APPLE]: "apple",
  [LOGIN.GITHUB]: "github",
  [LOGIN.LINKEDIN]: "linkedin",
  [LOGIN.TWITTER]: "twitter",
  [LOGIN.WEIBO]: "weibo",
  [LOGIN.LINE]: "line",
  [LOGIN.EMAIL_PASSWORD]: "Username-Password-Authentication",
  [LOGIN.PASSWORDLESS]: "email",
};

export const padUrlString = (url: URL): string => (url.href.endsWith("/") ? url.href : `${url.href}/`);

/**
 * Returns a random number. Don't use for cryptographic purposes.
 * @returns a random number
 */
export const randomId = (): string => Math.random().toString(36).slice(2);

export const broadcastChannelOptions = {
  // type: 'localstorage', // (optional) enforce a type, oneOf['native', 'idb', 'localstorage', 'node']
  webWorkerSupport: false, // (optional) set this to false if you know that your channel will never be used in a WebWorker (increases performance)
};

function caseSensitiveField(field: string, isCaseSensitive?: boolean): string {
  return isCaseSensitive ? field : field.toLowerCase();
}

export const getVerifierId = (
  userInfo: Auth0UserInfo,
  typeOfLogin: LOGIN_TYPE,
  verifierIdField?: string,
  isVerifierIdCaseSensitive = true
): string => {
  const { name, email } = userInfo;
  if (verifierIdField) return caseSensitiveField(userInfo[verifierIdField], isVerifierIdCaseSensitive);
  switch (typeOfLogin) {
    case LOGIN.PASSWORDLESS:
    case LOGIN.EMAIL_PASSWORD:
      return caseSensitiveField(name, isVerifierIdCaseSensitive);
    case LOGIN.WEIBO:
    case LOGIN.GITHUB:
    case LOGIN.TWITTER:
    case LOGIN.APPLE:
    case LOGIN.LINKEDIN:
    case LOGIN.LINE:
    case LOGIN.JWT:
      return caseSensitiveField(email, isVerifierIdCaseSensitive);
    default:
      throw new Error("Invalid login type");
  }
};

export const handleRedirectParameters = (
  hash: string,
  queryParameters: TorusGenericObject
): { error: string; instanceParameters: TorusGenericObject; hashParameters: TorusGenericObject } => {
  const hashParameters: TorusGenericObject = hash.split("&").reduce((result, item) => {
    const [part0, part1] = item.split("=");
    result[part0] = part1;
    return result;
  }, {});
  log.info(hashParameters, queryParameters);
  let instanceParameters: TorusGenericObject = {};
  let error = "";
  if (Object.keys(hashParameters).length > 0 && hashParameters.state) {
    instanceParameters = JSON.parse(atob(decodeURIComponent(decodeURIComponent(hashParameters.state)))) || {};
    error = hashParameters.error_description || hashParameters.error || error;
  } else if (Object.keys(queryParameters).length > 0 && queryParameters.state) {
    instanceParameters = JSON.parse(atob(decodeURIComponent(decodeURIComponent(queryParameters.state)))) || {};
    if (queryParameters.error) error = queryParameters.error;
  }
  return { error, instanceParameters, hashParameters };
};

export function storageAvailable(type: REDIRECT_PARAMS_STORAGE_METHOD_TYPE): boolean {
  let storage: Storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}

export function getPopupFeatures(): string {
  // Fixes dual-screen position                             Most browsers      Firefox
  const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

  const w = 1200;
  const h = 700;

  const width = window.innerWidth
    ? window.innerWidth
    : document.documentElement.clientWidth
    ? document.documentElement.clientWidth
    : window.screen.width;

  const height = window.innerHeight
    ? window.innerHeight
    : document.documentElement.clientHeight
    ? document.documentElement.clientHeight
    : window.screen.height;

  const systemZoom = 1; // No reliable estimate

  const left = Math.abs((width - w) / 2 / systemZoom + dualScreenLeft);
  const top = Math.abs((height - h) / 2 / systemZoom + dualScreenTop);
  const features = `titlebar=0,toolbar=0,status=0,location=0,menubar=0,height=${h / systemZoom},width=${w / systemZoom},top=${top},left=${left}`;
  return features;
}

export const isFirefox = (): boolean => window?.navigator?.userAgent.toLowerCase().indexOf("firefox") > -1 || false;

export function constructURL(params: { baseURL: string; query?: Record<string, unknown>; hash?: Record<string, unknown> }): string {
  const { baseURL, query, hash } = params;

  const url = new URL(baseURL);
  if (query) {
    Object.keys(query).forEach((key) => {
      url.searchParams.append(key, query[key] as string);
    });
  }
  if (hash) {
    const h = new URL(constructURL({ baseURL, query: hash })).searchParams.toString();
    url.hash = h;
  }
  return url.toString();
}

export function are3PCSupported(): boolean {
  const browserInfo = Bowser.parse(navigator.userAgent);
  log.info(JSON.stringify(browserInfo), "current browser info");

  let thirdPartyCookieSupport = true;
  // brave
  if ((navigator as unknown as { brave: boolean })?.brave) {
    thirdPartyCookieSupport = false;
  }
  // All webkit & gecko engine instances use itp (intelligent tracking prevention -
  // https://webkit.org/tracking-prevention/#intelligent-tracking-prevention-itp)
  if (browserInfo.engine.name === Bowser.ENGINE_MAP.WebKit || browserInfo.engine.name === Bowser.ENGINE_MAP.Gecko) {
    thirdPartyCookieSupport = false;
  }

  return thirdPartyCookieSupport;
}

export const validateAndConstructUrl = (domain: string): URL => {
  try {
    const url = new URL(decodeURIComponent(domain));
    return url;
  } catch (error) {
    throw new Error(`${error?.message || ""}, Note: Your jwt domain: (i.e ${domain}) must have http:// or https:// prefix`);
  }
};

export const wait = (s: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, s * 1000);
  });
