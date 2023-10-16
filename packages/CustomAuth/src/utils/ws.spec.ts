import WebSocket from "jest-websocket-mock";
import { setTimeout } from "timers";

import { conditionTransform, subscribeTx } from "./ws"; // Adjust the import path accordingly

describe("ws.ts", function() {
  describe("conditionTransform", function() {
    it("should return an empty string for an empty object", function() {
      const queryTags = {};
      const result = conditionTransform(queryTags);
      expect(result).toBe("");
    });

    it("should transform query tags into a condition string", function() {
      const queryTags = {
        name: "John",
        age: 30,
        city: "New York",
      };
      const result = conditionTransform(queryTags);
      // The expected result should be "AND name = 'John' AND age = '30' AND city = 'New York'"
      expect(result).toBe("AND name = 'John' AND age = '30' AND city = 'New York'");
    });
  });

  describe("subscribeAssignKey", function() {
    let server;
    const host = "ws://testnet.rpc.orai.io/websocket";

    beforeAll(async function() {
      // Create a WebSocket server mock
      server = new WebSocket(host);
    });

    afterAll(function() {
      // Clean up and close the WebSocket server mock
      server.close();
    });

    it("should subscribe and resolve with the expected value", async function() {
      const expectedResult = {
        "wasm._contract_address": "contractAddress",
        "wasm.action": "action",
        "wasm.verify_id": "verifyId",
        "wasm.verifier": "verifier",
        "tx.hash": "txHash",
      };

      const promise = subscribeTx(host, expectedResult);
      await server.connected;
      // Simulate the WebSocket server response
      server.send(
        JSON.stringify({
          jsonrpc: "2.0",
          result: {
            events: {
              "wasm._contract_address": [expectedResult["wasm._contract_address"]],
              "wasm.action": [expectedResult["wasm.action"]],
              "wasm.verify_id": [expectedResult["wasm.verify_id"]],
              "wasm.verifier": [expectedResult["wasm.verifier"]],
              "tx.hash": [expectedResult["tx.hash"]],
            },
          },
        })
      );

      const result = await promise;
      expect(result).toStrictEqual({
        "wasm._contract_address": ["contractAddress"],
        "wasm.action": ["action"],
        "wasm.verify_id": ["verifyId"],
        "wasm.verifier": ["verifier"],
        "tx.hash": ["txHash"],
        txHash: "txHash",
      });
    });

    it("should reject with a timeout error", async function() {
      const condition = {}; // Replace with your test condition

      const promise = subscribeTx(host, condition, 1000); // Use a short timeout for testing
      await server.connected;

      // Wait for the timeout to occur
      await expect(promise).rejects.toThrowError("subscribe timed out after 1000 ms");
    });

    it("should reject with an error on WebSocket error", async function() {
      const condition = {
        "wasm._contract_address": "contractAddress",
        "wasm.action": "action",
        "wasm.verify_id": "verifyId",
        "wasm.verifier": "verifier",
        "tx.hash": "txHash",
      }; // Replace with your test condition

      const promise = subscribeTx(host, condition);
      await server.connected;

      // Simulate a WebSocket error
      await Promise.resolve(setTimeout(() => server.error(), 4000));

      await expect(promise).rejects.toThrowError();
    });
  });
});
