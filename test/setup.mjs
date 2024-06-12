import Register from "@babel/register";
import JSDOM from "jsdom-global";
import path from "path";
import { register } from "ts-node";

JSDOM(``, {
  url: "http://localhost",
});

register({
  project: path.resolve("tsconfig.json"),
  transpileOnly: true,
  compilerOptions: { module: "esnext" },
});

Register({
  extensions: [".ts", ".js"],
  rootMode: "upward",
});

const storeFn = {
  getItem(key) {
    return this[key];
  },
  setItem(key, value) {
    this[key] = value;
  },
};
globalThis.localStorage = { ...storeFn };
globalThis.sessionStorage = { ...storeFn };
