import { ShareStore } from "@tkey/common-types";

import WebStorageError from "./errors";
import { getWindow } from "./utils";

const win = getWindow();

function storageAvailable(type: string): boolean {
  let storage: Storage;
  try {
    storage = win[type];
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

export const storeShareOnLocalStorage = async (share: ShareStore, key: string): Promise<void> => {
  const fileStr = JSON.stringify(share);
  if (!storageAvailable("localStorage")) {
    throw WebStorageError.localStorageUnavailable();
  }
  win.localStorage.setItem(key, fileStr);
};

export const getShareFromLocalStorage = async (key: string): Promise<ShareStore> => {
  if (!storageAvailable("localStorage")) {
    throw WebStorageError.localStorageUnavailable();
  }
  const foundFile = win.localStorage.getItem(key);
  if (!foundFile) throw WebStorageError.shareUnavailableInLocalStorage();
  return ShareStore.fromJSON(JSON.parse(foundFile));
};
