import { derivePubKeyXFromPolyID, ShareStore } from "@tkey/common-types";

// Web Specific declarations
const requestedBytes = 1024 * 1024 * 10; // 10MB
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
declare global {
  interface Navigator {
    webkitPersistentStorage: {
      requestQuota: (a: number, b: (grantedBytes: number) => void, c: (reason: string) => void) => unknown;
    };
  }
}

function download(filename: string, text: string): void {
  const element = document.createElement("a");
  element.setAttribute("href", `data:application/json;charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
async function requestQuota(): Promise<number> {
  return new Promise((resolve, reject) => {
    navigator.webkitPersistentStorage.requestQuota(requestedBytes, resolve, reject);
  });
}
async function browserRequestFileSystem(grantedBytes: number): Promise<FileSystem> {
  return new Promise((resolve, reject) => {
    window.requestFileSystem(window.PERSISTENT, grantedBytes, resolve, reject);
  });
}
async function getFile(fs: FileSystem, path: string, create: boolean): Promise<FileEntry> {
  return new Promise((resolve, reject) => {
    fs.root.getFile(path, { create }, resolve, reject);
  });
}
async function readFile(fileEntry: FileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
}

export const getShareFromFileStorage = async (polyID: string): Promise<ShareStore> => {
  const fileName = derivePubKeyXFromPolyID(polyID);
  if (window.requestFileSystem) {
    const grantedBytes = await requestQuota();
    const fs = await browserRequestFileSystem(grantedBytes);

    const fileEntry = await getFile(fs, fileName, true);
    const file = await readFile(fileEntry);
    const fileStr = await file.text();
    if (!fileStr) {
      throw new Error("No Share exists in file system");
    }
    return ShareStore.fromJSON(JSON.parse(fileStr));
  }
  throw new Error("no requestFileSystem");
};

export const storeShareOnFileStorage = async (share: ShareStore): Promise<void> => {
  // if we're on chrome (thus window.requestFileSystem exists) we use it
  const fileName = `${derivePubKeyXFromPolyID(share.polynomialID)}.json`;
  const fileStr = JSON.stringify(share);
  if (window.requestFileSystem) {
    const grantedBytes = await requestQuota();
    const fs = await browserRequestFileSystem(grantedBytes);
    const fileEntry = await getFile(fs, fileName, true);
    await new Promise((resolve, reject) => {
      fileEntry.createWriter((fileWriter) => {
        fileWriter.onwriteend = resolve;
        fileWriter.onerror = reject;
        const bb = new Blob([fileStr], { type: "application/json" });
        fileWriter.write(bb);
      }, reject);
    });
  } else {
    // we make the user download a file
    download(fileName, fileStr);
  }
};

export const canAccessFileStorage = async (): Promise<PermissionStatus> => {
  return navigator.permissions.query({ name: "persistent-storage" });
};
