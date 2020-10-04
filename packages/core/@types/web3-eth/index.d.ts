import { Eth } from "web3-eth";

declare module "web3-eth" {
  export default class Web3Eth extends Eth {}
}
