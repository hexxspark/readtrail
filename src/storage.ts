import type { StorageData, ReadState } from "./types";
import { CONSTANTS } from "./constants";
import { extractDomain } from "./utils";

export class Storage {
  private cache: Map<string, StorageData>;

  constructor() {
    this.cache = new Map();
  }

  private getKey(url: string): string {
    return `${CONSTANTS.STORAGE_PREFIX}${extractDomain(url)}`;
  }

  private isStorageData(data: unknown): data is StorageData {
    if (typeof data !== "object" || data === null) {
      return false;
    }

    return Object.values(data as Record<string, unknown>).every((value) => {
      return (
        typeof value === "object" &&
        value !== null &&
        "timestamp" in value &&
        typeof (value as ReadState).timestamp === "number" &&
        "replyCount" in value &&
        typeof (value as ReadState).replyCount === "number"
      );
    });
  }

  public get(url: string): StorageData {
    const key = this.getKey(url);
    if (!this.cache.has(key)) {
      const stored = GM_getValue<unknown>(key, {});
      const safeStored: StorageData = this.isStorageData(stored) ? stored : {};
      this.cache.set(key, safeStored);
    }
    return this.cache.get(key) as StorageData;
  }

  public set(url: string, data: ReadState): void {
    const key = this.getKey(url);
    const storage = this.get(url);
    storage[url] = data;
    this.cache.set(key, storage);
    this.persist(key, storage);
  }

  private persist(key: string, data: StorageData): void {
    GM_setValue(key, data);
    localStorage.setItem(
      CONSTANTS.EVENTS.STORAGE,
      JSON.stringify({
        timestamp: Date.now(),
        key,
        data,
      }),
    );
  }
}
