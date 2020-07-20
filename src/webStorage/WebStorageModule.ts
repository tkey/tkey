import { IModule, IThresholdBak } from "../base/aggregateTypes";
import ShareStore from "../base/ShareStore";

// Web Specific declarations
const requestedBytes = 1024 * 1024 * 10; // 10MB
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
declare global {
  interface Navigator {
    webkitPersistentStorage: {
      requestQuota: (a, b: (grantedBytes: number) => void, c) => unknown;
    };
  }
}
function storageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}
function download(filename, text) {
  const element = document.createElement("a");
  element.setAttribute("href", `data:application/json;charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
async function requestQuota(): Promise<number> {
  return new Promise(function (resolve, reject) {
    navigator.webkitPersistentStorage.requestQuota(requestedBytes, resolve, reject);
  });
}
async function chromeRequestFileSystem(grantedBytes): Promise<FileSystem> {
  return new Promise(function (resolve, reject) {
    window.requestFileSystem(window.PERSISTENT, grantedBytes, resolve, reject);
  });
}
async function getFile(fs: FileSystem, path: string, create: boolean): Promise<FileEntry> {
  return new Promise(function (resolve, reject) {
    fs.root.getFile(path, { create }, resolve, reject);
  });
}

class WebStorageModule implements IModule {
  moduleName: string;

  tbSDK: IThresholdBak;

  constructor() {
    this.moduleName = "webStorage";
  }

  initialize(tbSDK: IThresholdBak): void {
    this.tbSDK = tbSDK;
    // this.tbSDK.addRefreshMiddleware(this.moduleName, this.refreshSecurityQuestionsMiddleware.bind(this));
  }

  async storeShareOnFileStorage(share: ShareStore): Promise<void> {
    // if we're on chrome (thus window.requestFileSystem exists) we use it
    const fileName = `${share.polynomialID.split("|")[0]}.json`;
    const fileStr = JSON.stringify(share);
    if (window.requestFileSystem) {
      const grantedBytes = await requestQuota();
      const fs = await chromeRequestFileSystem(grantedBytes);

      const fileEntry = await getFile(fs, fileName, true);
      await new Promise(function (resolve) {
        fileEntry.createWriter(
          function (fileWriter) {
            fileWriter.onwriteend = function (e) {
              // console.log("stored share on web");
              resolve(e);
            };

            fileWriter.onerror = function (e) {
              throw Error(`Write failed: ${e.toString()}`);
            };

            const bb = new Blob([fileStr], { type: "application/json" });
            fileWriter.write(bb);
          },
          function (e) {
            throw Error(`createWriter failed: ${e.toString()}`);
          }
        );
      });
    } else {
      // we make the user download a file
      download(fileName, fileStr);
    }
  }

  async storeShareOnLocalStorage(share: ShareStore) {
    const fileName = share.polynomialID.split("|")[0];
    const fileStr = JSON.stringify(share);
    if (!storageAvailable("localStorage")) {
      throw Error("local storage isn't enabled");
    }
    localStorage.setItem(fileName, fileStr);
  }
}

export default WebStorageModule;
