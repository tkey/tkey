import { get } from "@toruslabs/http-helpers";
import deepmerge from "lodash.merge";

import { LOGIN_TYPE, UX_MODE_TYPE } from "../utils/enums";
import AbstractLoginHandler from "./AbstractLoginHandler";
import { Auth0ClientOptions, LoginWindowResponse, TorusGenericObject, TorusVerifierResponse } from "./interfaces";

export default class TwitchHandler extends AbstractLoginHandler {
  private readonly RESPONSE_TYPE: string = "token";

  private readonly SCOPE: string = "user:read:email";

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
    const finalUrl = new URL("https://id.twitch.tv/oauth2/authorize");
    const clonedParams = JSON.parse(JSON.stringify(this.jwtParams || {}));
    const finalJwtParams = deepmerge(
      {
        state: this.state,
        response_type: this.RESPONSE_TYPE,
        client_id: this.clientId,
        redirect_uri: this.redirect_uri,
        scope: this.SCOPE,
        force_verify: true,
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
    const userInfo = await get<{ data: [{ profile_image_url: string; display_name: string; email: string; id: string }] }>(
      "https://api.twitch.tv/helix/users",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-ID": this.clientId,
        },
      }
    );
    const [{ profile_image_url: profileImage = "", display_name: name = "", email = "", id: verifierId }] = userInfo.data || [];
    return {
      profileImage,
      name,
      email,
      verifierId,
      typeOfLogin: this.typeOfLogin,
    };
  }
}
