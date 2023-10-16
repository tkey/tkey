import { get } from "@toruslabs/http-helpers";
import deepmerge from "lodash.merge";

import { LOGIN_TYPE, UX_MODE_TYPE } from "../utils/enums";
import AbstractLoginHandler from "./AbstractLoginHandler";
import { Auth0ClientOptions, LoginWindowResponse, TorusGenericObject, TorusVerifierResponse } from "./interfaces";

export default class FacebookHandler extends AbstractLoginHandler {
  private readonly RESPONSE_TYPE: string = "token";

  private readonly SCOPE: string = "public_profile email";

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
    const finalUrl = new URL("https://www.facebook.com/v15.0/dialog/oauth");
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
    const userInfo = await get<{ name: string; id: string; picture: { data: { url?: string } }; email?: string }>(
      "https://graph.facebook.com/me?fields=name,email,picture.type(large)",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const { name = "", id, picture, email = "" } = userInfo;
    return {
      email,
      name,
      profileImage: picture.data.url || "",
      verifierId: id,
      typeOfLogin: this.typeOfLogin,
    };
  }
}
