import { LOGIN } from "../utils/enums";
import DiscordHandler from "./DiscordHandler";
import FacebookHandler from "./FacebookHandler";
import GoogleHandler from "./GoogleHandler";
import { CreateHandlerParams, ILoginHandler } from "./interfaces";
import JwtHandler from "./JwtHandler";
import PasswordlessHandler from "./PasswordlessHandler";
import RedditHandler from "./RedditHandler";
import TwitchHandler from "./TwitchHandler";

const createHandler = ({
  clientId,
  redirect_uri,
  typeOfLogin,
  jwtParams,
  redirectToOpener,
  uxMode,
  customState,
}: CreateHandlerParams): ILoginHandler => {
  if (!typeOfLogin || !clientId) {
    throw new Error("Invalid params");
  }
  const { domain, login_hint } = jwtParams || {};
  switch (typeOfLogin) {
    case LOGIN.GOOGLE:
      return new GoogleHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    case LOGIN.FACEBOOK:
      return new FacebookHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    case LOGIN.TWITCH:
      return new TwitchHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    case LOGIN.REDDIT:
      return new RedditHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    case LOGIN.DISCORD:
      return new DiscordHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    case LOGIN.PASSWORDLESS:
      if (!domain || !login_hint) throw new Error("Invalid params");
      return new PasswordlessHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    case LOGIN.APPLE:
    case LOGIN.GITHUB:
    case LOGIN.LINKEDIN:
    case LOGIN.TWITTER:
    case LOGIN.WEIBO:
    case LOGIN.LINE:
    case LOGIN.EMAIL_PASSWORD:
    case LOGIN.JWT:
      if (!domain) throw new Error("Invalid params");
      return new JwtHandler(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    default:
      throw new Error("Invalid login type");
  }
};

export default createHandler;
