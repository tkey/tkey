import { ShareStore } from "../base";
declare global {
    interface Navigator {
        webkitPersistentStorage: {
            requestQuota: (a: any, b: (grantedBytes: number) => void, c: any) => unknown;
        };
    }
}
export declare const getShareFromChromeFileStorage: (polyID: string) => Promise<ShareStore>;
export declare const storeShareOnFileStorage: (share: ShareStore) => Promise<void>;
