import { promiseTimeout } from "@toruslabs/http-helpers";

export async function getClientIp(): Promise<string> {
  try {
    return await promiseTimeout(
      10000,
      fetch("https://icanhazip.com", {}).then((response) => {
        if (response.ok) {
          return response.text();
        }
        throw response;
      })
    );
  } catch {
    // returning empty ip in case ip service server might be down or slow.
    return "";
  }
}
