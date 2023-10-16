import { get } from "@toruslabs/http-helpers";
import deepmerge from "lodash.merge";

import { LOGIN_TYPE, UX_MODE_TYPE } from "../utils/enums";
import AbstractLoginHandler from "./AbstractLoginHandler";
import { Auth0ClientOptions, LoginWindowResponse, TorusGenericObject, TorusVerifierResponse } from "./interfaces";

export default class DiscordHandler extends AbstractLoginHandler {
  private readonly RESPONSE_TYPE: string = "token";

  private readonly SCOPE: string = "identify email";

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
    const finalUrl = new URL("https://discord.com/api/oauth2/authorize");
    const clonedParams = JSON.parse(JSON.stringify(this.jwtParams || {}));
    const finalJwtParams = deepmerge(
      {
        state: this.state,
        response_type: this.RESPONSE_TYPE,
        client_id: this.clientId,
        redirect_uri: this.redirect_uri,
        scope: this.SCOPE,
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
    const userInfo = await get<{ id: string; username: string; discriminator: string; avatar?: string; email?: string }>(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const { id, avatar, email = "", username: name = "", discriminator = "" } = userInfo;
    const profileImage =
      avatar === null
        ? `https://cdn.discord.com/embed/avatars/${Number(discriminator) % 5}.png`
        : `https://cdn.discord.com/avatars/${id}/${avatar}.png?size=2048`;
    return {
      profileImage,
      name: `${name}#${discriminator}`,
      email,
      verifierId: id,
      typeOfLogin: this.typeOfLogin,
    };
  }
}
