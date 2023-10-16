enum WEBSOCKET_CODE_ONCLOSE {
  ERROR = 4000,
  SUCCESS = 3000,
}

export interface QueryTags {
  [key: string]: string | number;
}

export function fromRPCtoWebsocket(url: string) {
  const rpcURL = new URL(url);
  rpcURL.protocol = "wss";
  rpcURL.pathname = "/websocket";
  return rpcURL.toString();
}

export type SubcribeRespone = QueryTags & { txHash: string };

export const conditionTransform = (queryTags: QueryTags) => {
  let condition = "";
  Object.keys(queryTags).forEach((key) => {
    condition += condition ? ` AND ${key} = '${queryTags[key]}'` : `AND ${key} = '${queryTags[key]}'`;
  });
  return condition;
};

export const subscribeTx = async (url: string, tags: QueryTags, timeout = 15000): Promise<SubcribeRespone> => {
  const conditionString = conditionTransform(tags);
  return new Promise((resolve, reject) => {
    // Set up the timeout
    const ws = new WebSocket(url);

    const timer = setTimeout(() => {
      reject(new Error(`subscribe timed out after ${timeout} ms`));
      ws.send(JSON.stringify({ jrpc: "2.0", method: "unsubscribe", id: "99", params: [] }));
      return ws.close();
    }, timeout);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "subscribe",
          params: [`tm.event = 'Tx' ${conditionString}`],
          id: "1",
        })
      );
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if ("events" in data.result) {
        const events = data?.result?.events;
        const keysFromTags = Object.keys(tags);
        const extractValueFromEvent = keysFromTags.reduce((acc, key) => {
          acc[key] = events[key];
          return acc;
        }, {} as QueryTags & { txHash: string });
        extractValueFromEvent.txHash = events["tx.hash"][0];

        clearTimeout(timer);
        resolve(extractValueFromEvent);
        ws.send(JSON.stringify({ jrpc: "2.0", method: "unsubscribe", id: "99", params: [] }));
        return ws.close(WEBSOCKET_CODE_ONCLOSE.SUCCESS);
      }
    };

    ws.onerror = (errorEvent) => {
      reject(new Error(`WebSocket error ${errorEvent.type}`));
      ws.send(JSON.stringify({ jrpc: "2.0", method: "unsubscribe", id: "99", params: [] }));
      return ws.close(WEBSOCKET_CODE_ONCLOSE.ERROR);
    };

    ws.onclose = (event) => {
      clearTimeout(timer);

      if (event.code !== WEBSOCKET_CODE_ONCLOSE.ERROR && event.code !== WEBSOCKET_CODE_ONCLOSE.SUCCESS) {
        return reject(new Error(`WebSocket closed unexpectedly with code ${event.code}`));
      }
    };
  });
};
