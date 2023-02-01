/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
import { post } from "@toruslabs/http-helpers";
globalThis.js_post = async function (url, data) {
  try {
    const result = await post(url, JSON.parse(data));
    return JSON.stringify(result);
  } catch (e) {
    console.log("error happend here");
    console.log(e);
  }
};
