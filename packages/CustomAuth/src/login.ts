import Torus, { JRPCResponse, KeyAssignCommitmentRequestResult, MapNewVeririerIdCommitmentRequestResult, Some } from "@oraichain/torus.js";
import { generateJsonRPCObject, post } from "@toruslabs/http-helpers";
import { keccak256 } from "web3-utils";

import createHandler from "./handlers/HandlerFactory";
import {
  CustomAuthArgs,
  ExtraParams,
  ILoginHandler,
  InitParams,
  LoginWindowResponse,
  MapNewVerifierParams,
  SingleLoginParams,
  TorusGenericObject,
  TorusKey,
  TorusLoginResponse,
  TorusVerifierResponse,
} from "./handlers/interfaces";
import { registerServiceWorker } from "./registerServiceWorker";
import { INetworkConfig, Member, Network, NetworkConfig, query } from "./utils/blockchain";
import { UX_MODE, UX_MODE_TYPE } from "./utils/enums";
import { handleRedirectParameters, isFirefox, padUrlString } from "./utils/helpers";
import log from "./utils/loglevel";
import { fromRPCtoWebsocket, subscribeTx } from "./utils/ws";

class CustomAuth {
  isInitialized: boolean;

  config: {
    baseUrl: string;
    redirectToOpener: boolean;
    redirect_uri: string;
    uxMode: UX_MODE_TYPE;
    locationReplaceOnRedirect: boolean;
    popupFeatures: string;
  };

  torus: Torus;

  networkConfig: INetworkConfig;

  constructor({
    baseUrl,
    network = Network.MAINNET,
    enableLogging = true,
    enableOneKey = false,
    redirectToOpener = false,
    redirectPathName = "redirect",
    uxMode = UX_MODE.POPUP,
    locationReplaceOnRedirect = false,
    popupFeatures,
    metadataUrl = "https://metadata-social-login.orai.io",
    blsdkg,
    networkConfig,
  }: CustomAuthArgs) {
    this.isInitialized = false;
    const baseUri = new URL(baseUrl);
    this.config = {
      baseUrl: padUrlString(baseUri),
      get redirect_uri() {
        return `${this.baseUrl}${redirectPathName}`;
      },
      redirectToOpener,
      uxMode,
      locationReplaceOnRedirect,
      popupFeatures,
    };
    const torus = new Torus({
      enableOneKey,
      metadataHost: metadataUrl,
      network,
      blsdkg,
    });
    this.torus = torus;
    this.networkConfig = networkConfig ? { ...NetworkConfig[network], ...networkConfig } : NetworkConfig[network];

    if (enableLogging) log.enableAll();
    else log.disableAll();
  }

  async init({ skipSw = false, skipInit = false, skipPrefetch = false }: InitParams = {}): Promise<void> {
    if (skipInit) {
      this.isInitialized = true;
      return;
    }
    if (!skipSw) {
      const fetchSwResponse = await fetch(`${this.config.baseUrl}sw.js`, { cache: "reload" });
      if (fetchSwResponse.ok) {
        try {
          await registerServiceWorker(this.config.baseUrl);
          this.isInitialized = true;
          return;
        } catch (error) {
          log.warn(error);
        }
      } else {
        throw new Error("Service worker is not being served. Please serve it");
      }
    }
    if (!skipPrefetch) {
      // Skip the redirect check for firefox
      if (isFirefox()) {
        this.isInitialized = true;
        return;
      }
      await this.handlePrefetchRedirectUri();
      return;
    }
    this.isInitialized = true;
  }

  async triggerLogin(args: SingleLoginParams): Promise<TorusLoginResponse> {
    const { verifier, typeOfLogin, idToken, accessToken } = args;
    let loginParams: LoginWindowResponse;
    let userInfo: any;

    if ((idToken && accessToken) || (!idToken && !accessToken)) {
      ({ loginParams, userInfo } = await this.login(args));
    } else {
      loginParams = { idToken };
      const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString()) as TorusGenericObject;
      userInfo = {
        verifierId: payload.email || payload.phone_number,
      };
    }

    try {
      const torusKey = await this.getTorusKey(
        typeOfLogin,
        { verifier_id: userInfo?.verifierId, verifier },
        loginParams.idToken || loginParams.accessToken,
        userInfo?.extraVerifierParams
      );
      return {
        ...torusKey,
        userInfo: {
          ...userInfo,
          ...loginParams,
          verifierId: userInfo?.verifierId,
        },
      };
    } catch (error) {
      throw new Error(`getTorusKey::${JSON.stringify(error.message)}`);
    }
  }

  async triggerLoginMobile(
    args: SingleLoginParams
  ): Promise<{ sharesIndexes: Buffer[]; shares: Buffer[]; userInfo?: TorusVerifierResponse; thresholdPublicKey: string }> {
    const { verifier, typeOfLogin, idToken, accessToken } = args;
    let loginParams: LoginWindowResponse;
    let userInfo: any;

    try {
      if ((idToken && accessToken) || (!idToken && !accessToken)) {
        ({ loginParams, userInfo } = await this.login(args));
      } else {
        loginParams = { idToken };
        const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString()) as TorusGenericObject;
        userInfo = {
          verifierId: payload.email || payload.phone_number,
        };
      }
    } catch (error) {
      throw new Error(`jwt_decode::${JSON.stringify(error)}`);
    }

    try {
      const { sharesIndexes, shares, thresholdPublicKey } = await this.getTorusKeyMobile(
        typeOfLogin,
        { verifier_id: userInfo?.verifierId, verifier },
        loginParams.idToken || loginParams.accessToken,
        userInfo?.extraVerifierParams
      );
      return {
        sharesIndexes,
        shares,
        userInfo: {
          ...userInfo,
          verifierId: userInfo?.verifierId,
        },
        thresholdPublicKey,
      };
    } catch (error) {
      throw new Error(`getTorusKeyMobile::${JSON.stringify(error)}`);
    }
  }

  async login(args: SingleLoginParams): Promise<{ loginParams: LoginWindowResponse; userInfo: TorusVerifierResponse }> {
    let { typeOfLogin, clientId, jwtParams, hash, queryParameters, customState, idToken, accessToken } = args;

    if (!this.isInitialized) {
      throw new Error("Not initialized yet");
    }

    const loginHandler: ILoginHandler = createHandler({
      typeOfLogin,
      clientId,
      redirect_uri: this.config.redirect_uri,
      redirectToOpener: this.config.redirectToOpener,
      jwtParams,
      uxMode: this.config.uxMode,
      customState,
    });

    let loginParams: LoginWindowResponse;
    if (hash && queryParameters) {
      const { error, hashParameters, instanceParameters } = handleRedirectParameters(hash, queryParameters);
      if (error) throw new Error(error);
      let rest: Partial<TorusGenericObject>;
      ({ access_token: accessToken, id_token: idToken, ...rest } = hashParameters);
      loginParams = { accessToken, idToken, ...rest, state: instanceParameters };
    } else {
      loginParams = await loginHandler.handleLoginWindow({
        locationReplaceOnRedirect: this.config.locationReplaceOnRedirect,
        popupFeatures: this.config.popupFeatures,
      });
    }

    const userInfo = await loginHandler.getUserInfo(loginParams);
    return {
      loginParams,
      userInfo,
    };
  }

  async getTorusKey(
    typeOfLogin: string,
    verifierParams: { verifier_id: string; verifier: string },
    idToken: string,
    additionalParams?: ExtraParams
  ): Promise<TorusKey> {
    const [{ found, verifierId }, { members: nodes }] = await Promise.all([
      this.lookUpVerifierId(verifierParams.verifier_id, verifierParams.verifier),
      this.getContractConfig(),
    ]);
    const endpoints = nodes.map((node: Member) => node.end_point);
    const indexes = nodes.map((_node: Member, index: number) => index);

    if (!found) {
      let nodeSignatures = await this.getKeyAssignCommitment(idToken, verifierId, verifierParams.verifier, endpoints);
      nodeSignatures = nodeSignatures.map((i: any) => i.result);
      await this.assignKey(typeOfLogin, idToken, verifierId, verifierParams.verifier, endpoints, nodeSignatures);
    }

    const shares = await this.torus.retrieveShares(
      typeOfLogin,
      endpoints,
      indexes,
      { ...verifierParams, verifier_id: verifierId },
      idToken,
      additionalParams
    );

    log.debug("torus-direct/getTorusKey", { retrieveShares: shares });

    return {
      privateKey: shares.privKey.toString(),
    };
  }

  async getTorusKeyMobile(
    typeOfLogin: string,
    verifierParams: { verifier_id: string; verifier: string },
    idToken: string,
    additionalParams?: ExtraParams
  ): Promise<{ sharesIndexes: Buffer[]; shares: Buffer[]; thresholdPublicKey: string }> {
    const [{ found, verifierId }, { members: nodes }] = await Promise.all([
      this.lookUpVerifierId(verifierParams.verifier_id, verifierParams.verifier),
      this.getContractConfig(),
    ]);
    const endpoints = nodes.map((node: Member) => node.end_point);
    const indexes = nodes.map((_node: Member, index: number) => index);

    if (!found) {
      let nodeSignatures;
      try {
        nodeSignatures = await this.getKeyAssignCommitment(idToken, verifierId, verifierParams.verifier, endpoints);
      } catch (error) {
        throw new Error(`getTorusKeyMobile::getAssignKeyCommitment::${JSON.stringify(error)}`);
      }
      nodeSignatures = nodeSignatures.map((i: any) => i.result);
      await this.assignKey(typeOfLogin, idToken, verifierId, verifierParams.verifier, endpoints, nodeSignatures);
    }

    return this.torus.retrieveSharesMobile(
      typeOfLogin,
      endpoints,
      indexes,
      { ...verifierParams, verifier_id: verifierId },
      idToken,
      additionalParams
    );
  }

  async getKeyAssignCommitment(
    idToken: string,
    verifierId: string,
    verifier: string,
    endpoints: string[]
  ): Promise<(void | JRPCResponse<KeyAssignCommitmentRequestResult>)[]> {
    const commitment = keccak256(idToken).slice(2);
    const promiseArr = [];

    for (let i = 0; i < endpoints.length; i += 1) {
      const p = post<JRPCResponse<KeyAssignCommitmentRequestResult>>(
        endpoints[i],
        generateJsonRPCObject("AssignKeyCommitmentRequest", {
          tokencommitment: commitment,
          verifier_id: verifierId,
          verifier,
        })
      ).catch((err) => {
        log.error("🚀 ~ file: login.ts:196 ~ CustomAuth ~ getKeyAssignCommitment ~ err:", err);
        log.error("AssignKeyCommitmentRequest", err);
        throw new Error(JSON.stringify(err));
      });
      promiseArr.push(p);
    }

    return Some<void | JRPCResponse<KeyAssignCommitmentRequestResult>, (void | JRPCResponse<KeyAssignCommitmentRequestResult>)[]>(
      promiseArr,
      (resultArr: (void | JRPCResponse<KeyAssignCommitmentRequestResult>)[]) => {
        const completedRequests = resultArr.filter((x) => {
          if (!x || typeof x !== "object") {
            return false;
          }
          if (x.error) {
            return false;
          }
          return true;
        });
        if (completedRequests.length >= ~~(endpoints.length / 2) + 1) {
          return Promise.resolve(completedRequests);
        }
        return Promise.reject(new Error(`invalid ${JSON.stringify(resultArr)}`));
      }
    );
  }

  async assignKey(
    typeOfLogin: string,
    idToken: string,
    verifierId: string,
    verifier: string,
    endpoints: string[],
    nodeSignatures: (void | JRPCResponse<KeyAssignCommitmentRequestResult>)[]
  ) {
    const queryTag = {
      "wasm.verifier": verifier,
      "wasm.verify_id": verifierId,
      "wasm.action": "assign_key",
      "wasm._contract_address": this.networkConfig.contract,
    };
    const webSocketUrl = fromRPCtoWebsocket(this.networkConfig.rpc);
    const promiseSubcribe = subscribeTx(webSocketUrl, queryTag, 20000);

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const response = await post<JRPCResponse<{ status: string }>>(
      endpoint,
      generateJsonRPCObject("AssignKeyRequest", {
        typeOfLogin,
        idtoken: idToken,
        verifier_id: verifierId,
        verifier,
        nodesignatures: nodeSignatures,
      })
    ).catch((_error) => undefined);

    if (!response || typeof response !== "object") {
      throw new Error("assign key fail");
    }

    const attributes = await promiseSubcribe;

    return { txHash: attributes.txHash };
  }

  async mapNewVerifierId(mapNewVerifierIdParams: MapNewVerifierParams) {
    try {
      const [{ members: nodes }, { found, verifierId: newVerifierId }] = await Promise.all([
        this.getContractConfig(),
        this.lookUpVerifierId(mapNewVerifierIdParams.newVerifierId, mapNewVerifierIdParams.newVerifier),
      ]);
      if (found) throw new Error("New verifier id is already exist in system");
      const endpoints = nodes.map((node: Member) => node.end_point);
      const ranEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const queryTag = {
        "wasm.verifier": mapNewVerifierIdParams.verifier,
        "wasm.verifier_id": keccak256(mapNewVerifierIdParams.verifierId),
        "wasm.new_verifier": mapNewVerifierIdParams.newVerifier,
        "wasm.new_verifier_id": newVerifierId,
        "wasm.action": "map_exist_verifier_id_to_another_permit",
        "wasm._contract_address": this.networkConfig.contract,
      };
      const webSocketUrl = fromRPCtoWebsocket(this.networkConfig.rpc);
      const promiseSubcribe = subscribeTx(webSocketUrl, queryTag, 25000);

      const commitmentResponses = (
        await Promise.allSettled<JRPCResponse<MapNewVeririerIdCommitmentRequestResult>>(
          endpoints.map((endpoint: string) => {
            return post<JRPCResponse<MapNewVeririerIdCommitmentRequestResult>>(
              endpoint,
              generateJsonRPCObject("MappingNewVerifierIdCommitment", {
                typeOfLogin: mapNewVerifierIdParams.typeOfLogin,
                new_verifier: mapNewVerifierIdParams.newVerifier,
                new_verifier_id: newVerifierId,
                id_token: mapNewVerifierIdParams.idToken,
              })
            );
          })
        )
      )
        .filter((x: PromiseSettledResult<JRPCResponse<MapNewVeririerIdCommitmentRequestResult>>) => x.status === "fulfilled")
        .map((x: PromiseFulfilledResult<JRPCResponse<MapNewVeririerIdCommitmentRequestResult>>) => x.value);

      const nodeSignatures = commitmentResponses
        .map((response: JRPCResponse<MapNewVeririerIdCommitmentRequestResult>) => {
          if (!response || typeof response !== "object") {
            return undefined;
          }
          if (response.error) {
            return undefined;
          }
          return response.result;
        })
        .filter((x: MapNewVeririerIdCommitmentRequestResult | undefined) => x);

      const response = await post<JRPCResponse<{ status: string }>>(
        ranEndpoint,
        generateJsonRPCObject("MappingNewVerifierId", {
          signature: mapNewVerifierIdParams.signature,
          nodesignatures: nodeSignatures,
          verifier: mapNewVerifierIdParams.verifier,
          verifier_id: keccak256(mapNewVerifierIdParams.verifierId),
          new_verifier: mapNewVerifierIdParams.newVerifier,
          new_verifier_id: newVerifierId,
        })
      ).catch((_error) => undefined);
      if (!response || typeof response !== "object") {
        throw new Error("map new verifier id fail");
      }
      const attributes = await promiseSubcribe;

      return { txHash: attributes.txHash };
    } catch (error) {
      throw new Error(`map new verifier id fail:${error.message}`);
    }
  }

  async lookUpVerifierId(verifierId: string, verifier: string) {
    try {
      const [resp, resp2] = await Promise.all(
        [
          query(this.networkConfig, {
            verifier_id_info: {
              verifier_id: verifierId,
              verifier,
            },
          }),
          query(this.networkConfig, {
            verifier_id_info: {
              verifier_id: keccak256(verifierId),
              verifier,
            },
          }),
        ].map((p) => p.then((r) => ({ status: "fulfilled", result: r })).catch((e) => ({ status: "rejected", reason: e })))
      );

      if (resp.status === "fulfilled") {
        return { found: true, verifierId };
      } else if (resp2.status === "fulfilled") {
        return { found: true, verifierId: keccak256(verifierId) };
      }
      return { found: false, verifierId: keccak256(verifierId) };
    } catch (error) {
      throw new Error("Look up verifier id fail");
    }
  }

  async getContractConfig() {
    return query(this.networkConfig, {
      config: {},
    });
  }

  getPostboxKeyFrom1OutOf1(privKey: string, nonce: string): string {
    return this.torus.getPostboxKeyFrom1OutOf1(privKey, nonce);
  }

  async handlePrefetchRedirectUri(): Promise<void> {
    if (!document) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const redirectHtml = document.createElement("link");
      redirectHtml.href = this.config.redirect_uri;
      if (window.location.origin !== new URL(this.config.redirect_uri).origin) redirectHtml.crossOrigin = "anonymous";
      redirectHtml.type = "text/html";
      redirectHtml.rel = "prefetch";
      const resolveFn = () => {
        this.isInitialized = true;
        resolve();
      };
      try {
        if (redirectHtml.relList && redirectHtml.relList.supports) {
          if (redirectHtml.relList.supports("prefetch")) {
            redirectHtml.onload = resolveFn;
            redirectHtml.onerror = () => {
              reject(new Error(`Please serve redirect.html present in serviceworker folder of this package on ${this.config.redirect_uri}`));
            };
            document.head.appendChild(redirectHtml);
          } else {
            // Link prefetch is not supported. pass through
            resolveFn();
          }
        } else {
          // Link prefetch is not detectable. pass through
          resolveFn();
        }
      } catch (err) {
        resolveFn();
      }
    });
  }
}

export default CustomAuth;
