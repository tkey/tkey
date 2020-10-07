import Web3 from "web3-eth";
declare module "web3-eth" {
    export default class Web3Eth extends Eth {
    }
}
export default Web3;
