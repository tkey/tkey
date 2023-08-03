import { EncryptedStorage } from "./types/IEncryptedStorage";
import { SecureStore } from "./types/IExpoSecureStore";

export default class KeyStore {
  storage: SecureStore | EncryptedStorage;

  constructor(storage: SecureStore | EncryptedStorage) {
    this.storage = storage;
  }

  async get(key: string) {
    if ("getItemAsync" in this.storage) {
      return (this.storage as SecureStore).getItemAsync(key, {});
    }
    return (this.storage as EncryptedStorage).getItem(key);
  }

  async set(key: string, value: string) {
    if ("setItemAsync" in this.storage) {
      return (this.storage as SecureStore).setItemAsync(key, value, {});
    }
    return (this.storage as EncryptedStorage).setItem(key, value);
  }

  async remove(key: string) {
    if ("deleteItemAsync" in this.storage) {
      return (this.storage as SecureStore).deleteItemAsync(key, {});
    }
    return (this.storage as EncryptedStorage).removeItem(key);
  }
}
