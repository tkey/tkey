import Torus from "@toruslabs/torus.js"
import { encrypt, decrypt, generatePrivate, getPublic } from 'eccrypto'
import { ec as EC } from 'elliptic'
import BN from 'bn.js'


class TKDM {
    constructor({ enableLogging = false, peggedKey = "bef742202d22d45533cc512a550bcfc994259bc78ce98117a92387e72ee8240c"} = {}) {
        this.ec = new EC('secp256k1')
        this.enableLogging = enableLogging
        this.torus = new Torus()
        this.peggedKey = new BN()
    }
    initializeLogin() {
        let keyDetails = this.torus.generateMetadataParams({
        }, this.privKey)
        let response = this.torus.getMetadata(keyDetails)
        console.log(response)
        // this.torus.getMetadata
    }
    async initializeNewKey() {
        this.setKey(new BN(generatePrivate()))
        let shares = this.torus.generateRandomShares(2, 2, this.privKey)
        this.localShare = shares[1]
        // store torus share on metadata
        let shareDetails = Buffer.from(JSON.stringify( { [this.ecKey.getPublic()]: shares[0]}))
        let encryptedDetails = await encrypt(getPublic(this.privKey), shareDetails)
        let p = this.torus.generateMetadataParams(encryptedDetails, this.peggedKey)
        await this.torus.setMetadata(p)
        // store tdkm metadata about key
        let keyDetails = this.torus.generateMetadataParams({
            shareNonce: 2
        }, this.privKey)
        await this.torus.setMetadata(keyDetails)
        return { privKey: this.privKey, localShare: this.localShare}
    }
    setKey(privKey) {
        this.privKey = privKey
        this.ecKey = this.ec.keyFromPrivate(this.privKey)
        console.log(this.privKey)
    }
}


export default TKDM