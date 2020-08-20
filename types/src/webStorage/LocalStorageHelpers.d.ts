import { ShareStore } from "../base";
export declare const storeShareOnLocalStorage: (share: ShareStore) => Promise<void>;
export declare const getShareFromLocalStorage: (polyID: string) => Promise<ShareStore>;
