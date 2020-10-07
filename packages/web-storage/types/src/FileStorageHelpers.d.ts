import { ShareStore } from "@tkey/common-types";
declare global {
    interface Navigator {
        webkitPersistentStorage: {
            requestQuota: (a: number, b: (grantedBytes: number) => void, c: (reason: string) => void) => unknown;
        };
    }
}
export declare const getShareFromFileStorage: (polyID: string) => Promise<ShareStore>;
export declare const storeShareOnFileStorage: (share: ShareStore) => Promise<void>;
