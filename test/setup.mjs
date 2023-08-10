import Register from "@babel/register";
import FormData from "form-data";
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

globalThis.FormData = FormData;
