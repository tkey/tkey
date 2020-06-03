const TDKM = require("./dist/tdkm.cjs")

let tdkm = new TDKM()

tdkm.initializeNewKey().then(resp => {
    console.log(resp)
    // tdkm.initializeLogin()
})