import { CONSTANTS } from "./constants";
import type { LinkRecord } from "./types";
import { extractDomain, hashCode } from "./utils";

export class Storage {
  constructor() {}

  private getKey(url: string): string {
    const domain = extractDomain(url);
    const hash = hashCode(url);
    return `linkmark:${domain}:${hash}`;
  }

  private isLinkEntry(data: unknown): data is LinkRecord {
    if (typeof data !== "object" || data === null) {
      return false;
    }

    return (
      "timestamp" in data &&
      typeof (data as LinkRecord).timestamp === "number" &&
      "replyCount" in data &&
      typeof (data as LinkRecord).replyCount === "number"
    );
  }

  public async get(url: string): Promise<LinkRecord | null> {
    const key = this.getKey(url);
    try {
      const data = await GM.getValue(key, "{}");
      const stored = JSON.parse(data);
      return this.isLinkEntry(stored) ? stored : null;
    } catch (error) {
      return null;
    }
  }

  public async set(url: string, data: LinkRecord): Promise<void> {
    const key = this.getKey(url);
    await this.persist(key, data);
  }

  private async persist(key: string, data: LinkRecord): Promise<void> {
    await GM.setValue(key, JSON.stringify(data));
    // Trigger a storage event to notify other tabs
    await localStorage.setItem(
      CONSTANTS.EVENT.STORAGE,
      JSON.stringify({
        timestamp: Date.now(),
        key: key,
      })
    );
  }
}
