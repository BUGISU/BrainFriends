// src/lib/storage/adapters.ts

export interface KeyValueStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

class BrowserStorageAdapter implements KeyValueStorageAdapter {
  constructor(private readonly getStorage: () => Storage | null) {}

  getItem(key: string): string | null {
    return this.getStorage()?.getItem(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.getStorage()?.setItem(key, value);
  }

  removeItem(key: string): void {
    this.getStorage()?.removeItem(key);
  }

  keys(): string[] {
    const storage = this.getStorage();
    if (!storage) return [];
    return Object.keys(storage);
  }
}

const getLocalStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;
const getSessionStorage = () =>
  typeof window === "undefined" ? null : window.sessionStorage;

export const localStoreAdapter = new BrowserStorageAdapter(getLocalStorage);
export const sessionStoreAdapter = new BrowserStorageAdapter(getSessionStorage);

