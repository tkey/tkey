import { ShareStore } from "@tkey/common-types";
export declare const storeShareOnLocalStorage: (share: ShareStore, key: string) => Promise<void>;
export declare const getShareFromLocalStorage: (key: string) => Promise<ShareStore>;
