import ThresholdKey from "@tkey/core";
import ServiceProviderBase from "@tkey/service-provider-base";
import TorusStorageLayer, { MockStorageLayer } from "@tkey/storage-layer-torus";
import { deepStrictEqual, rejects, strictEqual } from "assert";

import WebStorageModule, { WEB_STORAGE_MODULE_NAME } from "../src/WebStorageModule";

function initStorageLayer(mocked, extraParams) {
  return mocked === "true" ? new MockStorageLayer({ serviceProvider: extraParams.serviceProvider }) : new TorusStorageLayer(extraParams);
}

const mocked = process.env.MOCKED || "false";
const metadataURL = process.env.METADATA || "http://localhost:5051";
const PRIVATE_KEY = "f70fb5f5970b363879bc36f54d4fc0ad77863bfd059881159251f50f48863acc";

const defaultSP = new ServiceProviderBase({ postboxKey: PRIVATE_KEY });
const defaultSL = initStorageLayer(mocked, { serviceProvider: defaultSP, hostUrl: metadataURL });

describe("web storage", function () {
  let tb;
  let tb2;
  beforeEach("Setup ThresholdKey", async function () {
    tb = new ThresholdKey({ serviceProvider: defaultSP, storageLayer: defaultSL, modules: { [WEB_STORAGE_MODULE_NAME]: new WebStorageModule() } });
    tb2 = new ThresholdKey({
      serviceProvider: defaultSP,
      storageLayer: defaultSL,
      modules: { [WEB_STORAGE_MODULE_NAME]: new WebStorageModule() },
    });
  });

  it("#should be able to input share from web storage", async function () {
    await tb._initializeNewKey({ initializeModules: true });
    const reconstructedKey = await tb.reconstructKey();
    await tb2.initialize();
    await tb2.modules[WEB_STORAGE_MODULE_NAME].inputShareFromWebStorage();
    const secondKey = await tb2.reconstructKey();
    deepStrictEqual(secondKey, reconstructedKey, "Must be equal");
  });

  it("#should be able to input share from web storage after reconstruction", async function () {
    await tb._initializeNewKey({ initializeModules: true });
    const reconstructedKey = await tb.reconstructKey();
    await tb.generateNewShare();
    await tb.reconstructKey();
    // console.log(reconstructedKey2.privKey);
    await tb2.initialize();
    await tb2.modules[WEB_STORAGE_MODULE_NAME].inputShareFromWebStorage();
    const secondKey = await tb2.reconstructKey();
    // console.log(reconstructedKey.privKey, secondKey.privKey);
    strictEqual(reconstructedKey.privKey.toString("hex"), secondKey.privKey.toString("hex"), "Must be equal");
  });

  it("#should be able to input share from web storage after external share deletion", async function () {
    await tb._initializeNewKey({ initializeModules: true });
    const reconstructedKey = await tb.reconstructKey();
    const newShare = await tb.generateNewShare();
    await tb.deleteShare(newShare.newShareIndex.toString("hex"));
    // console.log(reconstructedKey2.privKey
    await tb2.initialize();
    await tb2.modules[WEB_STORAGE_MODULE_NAME].inputShareFromWebStorage();
    const secondKey = await tb2.reconstructKey();
    // console.log(reconstructedKey.privKey, secondKey.privKey);
    strictEqual(reconstructedKey.privKey.toString("hex"), secondKey.privKey.toString("hex"), "Must be equal");
  });

  it("#should not be able to input share from web storage after deletion", async function () {
    const resp1 = await tb._initializeNewKey({ initializeModules: true });
    await tb.reconstructKey();
    // console.log("%O", tb.shares);
    await tb.generateNewShare();
    await tb.deleteShare(resp1.deviceShare.share.shareIndex.toString("hex"));
    // console.log("%O", tb.shares);
    await tb2.initialize();
    // console.log("%O", tb2.shares);
    await rejects(async () => {
      await tb2.modules[WEB_STORAGE_MODULE_NAME].inputShareFromWebStorage();
      await tb2.reconstructKey();
    });
  });

  it("#should be able to input external share from web storage after deletion", async function () {
    const resp1 = await tb._initializeNewKey({ initializeModules: true });
    const reconstructedKey = await tb.reconstructKey();
    // console.log("%O", tb.shares);
    const newShare = await tb.generateNewShare();
    await tb.deleteShare(resp1.deviceShare.share.shareIndex.toString("hex"));
    // console.log("%O", tb.shares);
    await tb2.initialize();

    await rejects(async () => {
      await tb2.modules[WEB_STORAGE_MODULE_NAME].inputShareFromWebStorage();
      await tb2.reconstructKey();
    });

    // console.log("%O", tb2.shares);
    await tb2.inputShareStore(newShare.newShareStores[newShare.newShareIndex.toString("hex")]);
    const secondKey = await tb2.reconstructKey();
    strictEqual(reconstructedKey.privKey.toString("hex"), secondKey.privKey.toString("hex"), "Must be equal");
  });
  it("#should be able to add custom device share info", async function () {
    const initialShareDeviceInfo = {
      browser: "brave",
    };
    await tb._initializeNewKey({
      initializeModules: true,
      customDeviceInfo: initialShareDeviceInfo,
    });
    const reconstructedKey = await tb.reconstructKey();

    const deviceShareDesc = await tb.metadata.getShareDescription();
    deepStrictEqual(
      JSON.parse(JSON.parse(deviceShareDesc[Object.keys(deviceShareDesc)[0]]).customDeviceInfo),
      initialShareDeviceInfo,
      "device info should be correct"
    );
    await tb2.initialize();
    await tb2.modules[WEB_STORAGE_MODULE_NAME].inputShareFromWebStorage();
    const secondKey = await tb2.reconstructKey();
    const deviceShareDesc2 = await tb2.metadata.getShareDescription();
    deepStrictEqual(secondKey, reconstructedKey, "Must be equal");
    deepStrictEqual(
      JSON.parse(JSON.parse(deviceShareDesc2[Object.keys(deviceShareDesc2)[0]]).customDeviceInfo),
      initialShareDeviceInfo,
      "device info should be correct"
    );
    const { newShareStores: newShareStores1, newShareIndex: newShareIndex1 } = await tb2.generateNewShare();
    const newDeviceShareInfo = {
      device_name: "my home's laptop",
    };
    await tb2.modules[WEB_STORAGE_MODULE_NAME].storeDeviceShare(newShareStores1[newShareIndex1.toString("hex")], newDeviceShareInfo);
    const deviceShareDesc3 = await tb2.metadata.getShareDescription();
    deepStrictEqual(
      JSON.parse(JSON.parse(deviceShareDesc3[newShareIndex1.toString("hex")]).customDeviceInfo),
      newDeviceShareInfo,
      "new device share info should be correct"
    );
  });
});
