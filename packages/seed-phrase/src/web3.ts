import Web3, { Eth } from "web3-eth";

// Because web3-eth typings are wrong
declare module "web3-eth" {
  export default class Web3Eth extends Eth {}
}
export default Web3;
