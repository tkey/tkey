export const LOGIN = {
  GOOGLE: "google",
  FACEBOOK: "facebook",
  REDDIT: "reddit",
  DISCORD: "discord",
  TWITCH: "twitch",
  APPLE: "apple",
  GITHUB: "github",
  LINKEDIN: "linkedin",
  TWITTER: "twitter",
  WEIBO: "weibo",
  LINE: "line",
  EMAIL_PASSWORD: "email_password",
  PASSWORDLESS: "passwordless",
  JWT: "jwt",
  WEBAUTHN: "webauthn",
} as const;

export const AGGREGATE_VERIFIER = {
  SINGLE_VERIFIER_ID: "single_id_verifier",
  // AND_AGGREGATE_VERIFIER : "and_aggregate_verifier",
  // OR_AGGREGATE_VERIFIER : "or_aggregate_verifier",
} as const;

export const UX_MODE = {
  POPUP: "popup",
} as const;

export const REDIRECT_PARAMS_STORAGE_METHOD = {
  LOCAL_STORAGE: "localStorage",
  SESSION_STORAGE: "sessionStorage",
  SERVER: "server",
};

export const TORUS_METHOD = {
  TRIGGER_LOGIN: "triggerLogin",
} as const;

export type LOGIN_TYPE = (typeof LOGIN)[keyof typeof LOGIN];
export type AGGREGATE_VERIFIER_TYPE = (typeof AGGREGATE_VERIFIER)[keyof typeof AGGREGATE_VERIFIER];
export type UX_MODE_TYPE = (typeof UX_MODE)[keyof typeof UX_MODE];
export type TORUS_METHOD_TYPE = (typeof TORUS_METHOD)[keyof typeof TORUS_METHOD];
export type REDIRECT_PARAMS_STORAGE_METHOD_TYPE = (typeof REDIRECT_PARAMS_STORAGE_METHOD)[keyof typeof REDIRECT_PARAMS_STORAGE_METHOD];
