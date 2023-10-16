import { get } from "@toruslabs/http-helpers";

export interface INetworkConfig {
  rpc: string;
  lcd: string;
  chainId: string;
  contract: string;
}

export enum Network {
  DEV = "development",
  TESTNET = "testnet",
  MAINNET = "mainnet",
  STAGING = "staging",
  PRODUCTION = "production",
}

export const NetworkConfig = {
  [Network.DEV]: {
    rpc: "https://rpc.testnet.orai.io",
    lcd: "https://lcd.testnet.orai.io",
    chainId: "Oraichain-testnet",
    contract: "orai182z6mxeta4dgaxu6qyuu5fywc3p7cdyz2udphd0nz5vnqkrdhzrscu8zan",
  },
  [Network.STAGING]: {
    rpc: "https://rpc.testnet.orai.io",
    lcd: "https://lcd.testnet.orai.io",
    chainId: "Oraichain-testnet",
    contract: "orai1j3ynfwl2gv7jujfhjqkwrgfwfsg2jth7fyv2g0ph9twc372ny7gqxhe5pj",
  },
  [Network.TESTNET]: {
    rpc: "https://rpc.testnet.orai.io",
    lcd: "https://lcd.testnet.orai.io",
    chainId: "Oraichain-testnet",
    contract: "orai1v5hwd3w4dx3628suz3lrhd9hr8ktdgjytu95kfsa0vxxmxj42rtsxv4sdn",
  },
  [Network.MAINNET]: {
    rpc: "https://rpc.orai.io",
    lcd: "https://lcd.orai.io",
    chainId: "Oraichain",
    contract: "orai1kvu7xclv2uvc5yl0mzgcux0cw40sjur2kksarva84376gq4qnnxqhk2hh5",
  },
  [Network.PRODUCTION]: {
    rpc: "https://rpc.orai.io",
    lcd: "https://lcd.orai.io",
    chainId: "Oraichain",
    contract: "orai1r7qwtfp7uc0jsemc8frnjgwc4gpspxnuhg7gjcv3slzul08gglds65tnrp",
  },
};

export const metadataUrl = {
  [Network.DEV]: "http://127.0.0.1:5051",
  [Network.STAGING]: "https://metadata.social-login-staging.orai.io",
  [Network.TESTNET]: "https://metadata.social-login-testnet.orai.io",
  [Network.MAINNET]: "https://metadata-social-login.orai.io",
  [Network.PRODUCTION]: "https://metadata-social-login.orai.io",
};

export interface Member {
  address: string;
  pub_key: string;
  end_point: string;
  index?: number;
}

export const query = async (config: INetworkConfig, input: any) => {
  const param = Buffer.from(JSON.stringify(input)).toString("base64");
  const resp = await get<{ data: any }>(`${config.lcd}/cosmwasm/wasm/v1/contract/${config.contract}/smart/${param}`);
  return resp?.data;
};
