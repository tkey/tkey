const TDKM = require("../dist/threshold-bak.cjs.js");
global.fetch = require("node-fetch");

const tdkm = new TDKM();

tdkm.initializeNewKey().then((resp) => {
  console.log("new key resp", resp);
  tdkm.initializeLogin();
});
