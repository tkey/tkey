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

globalThis.js_post_stream = async function (url, data) {
  try {
    // const result = await post(url, JSON.parse(data), );
    // return JSON.stringify(result);
    const finalMetadataParams = JSON.parse(data);

    const FD = new FormData();
    finalMetadataParams.forEach((el, index) => {
      FD.append(index.toString(), JSON.stringify(el));
    });
    const options = {
      mode: "cors",
      method: "POST",
      headers: {
        "Content-Type": undefined,
      },
    };

    const customOptions = {
      isUrlEncodedData: true,
      timeout: 600 * 1000, // 10 mins of timeout for excessive shares case
    };
    const result = await post(url, FD, options, customOptions);
    return JSON.stringify(result);
  } catch (e) {
    console.log("error happend here");
    console.log(e);
  }
};
