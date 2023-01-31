/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
import { post } from "@toruslabs/http-helpers";
console.log("enter file");
globalThis.js_post = async function (url, data) {
    console.log("enter function");
    console.log(url);
    console.log(data);
  //   const result = await post(url, JSON.stringify(data));
  //   return result;
  const testdata = {
    message: "test success",
  };
  return JSON.stringify(testdata);
};
