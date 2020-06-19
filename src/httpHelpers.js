export const promiseTimeout = (ms, promise) => {
  const timeout = new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Timed out in ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]);
};

export const post = (url = "", data = {}, opts = {}) => {
  const defaultOptions = {
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(data),
  };
  const options = {
    ...defaultOptions,
    ...opts,
    ...{ method: "POST" },
  };
  return promiseTimeout(
    12000,
    fetch(url, options).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw response;
    })
  );
};

export const generateJsonRPCObject = (method, params) => {
  return {
    jsonrpc: "2.0",
    method,
    id: 10,
    params,
  };
};
