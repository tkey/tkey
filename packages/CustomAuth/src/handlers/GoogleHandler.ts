import { get } from "@toruslabs/http-helpers";
import deepmerge from "lodash.merge";

import { LOGIN_TYPE, UX_MODE_TYPE } from "../utils/enums";
import AbstractLoginHandler from "./AbstractLoginHandler";
import { Auth0ClientOptions, LoginWindowResponse, TorusGenericObject, TorusVerifierResponse } from "./interfaces";

export default class GoogleHandler extends AbstractLoginHandler {
  private readonly RESPONSE_TYPE: string = "token id_token";

  private readonly SCOPE: string = "profile email openid";

  private readonly PROMPT: string = "consent select_account";

  constructor(
    readonly clientId: string,
    readonly redirect_uri: string,
    readonly typeOfLogin: LOGIN_TYPE,
    readonly uxMode: UX_MODE_TYPE,
    readonly redirectToOpener?: boolean,
    readonly jwtParams?: Auth0ClientOptions,
    readonly customState?: TorusGenericObject
  ) {
    super(clientId, redirect_uri, typeOfLogin, uxMode, redirectToOpener, jwtParams, customState);
    this.setFinalUrl();
  }

  setFinalUrl(): void {
    const finalUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const clonedParams = JSON.parse(JSON.stringify(this.jwtParams || {}));
    const finalJwtParams = deepmerge(
      {
        state: this.state,
        response_type: this.RESPONSE_TYPE,
        client_id: this.clientId,
        prompt: this.PROMPT,
        redirect_uri: this.redirect_uri,
        scope: this.SCOPE,
        nonce: this.nonce,
      },
      clonedParams
    );
    Object.keys(finalJwtParams).forEach((key) => {
      if (finalJwtParams[key]) finalUrl.searchParams.append(key, finalJwtParams[key]);
    });
    this.finalURL = finalUrl;
  }

  async getUserInfo(params: LoginWindowResponse): Promise<TorusVerifierResponse> {
    const { accessToken } = params;
    const userInfo = await get<{ picture: string; email: string; name: string }>("https://www.googleapis.com/userinfo/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const { picture: profileImage = "", email = "", name = "" } = userInfo;
    return {
      email,
      name,
      profileImage,
      verifierId: email.toLowerCase(),
      typeOfLogin: this.typeOfLogin,
    };
  }
}
