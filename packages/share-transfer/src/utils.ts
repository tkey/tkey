import { promiseTimeout } from "@toruslabs/http-helpers";

export async function getClientIp(): Promise<string> {
  try {
    return await promiseTimeout(
      10000,
      fetch("https://icanhazip.com", {}).then((response) => {
        if (response.ok) {
          return response.text();
        }
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw response;
      })
    );
  } catch (_) {
    // returning empty ip in case ip service server might be down or slow.
    return "";
  }
}
