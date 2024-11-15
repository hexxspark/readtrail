import { Storage } from "./storage";
import { CONSTANTS } from "./constants";
import { isMarkableLink } from "./utils";
import type { LinkRecord } from "./types";
import { StyleManager } from "./styles";
import log from "./logger";

export class Marker {
  private storage: Storage;
  private styleManager: StyleManager;
  private activeLinks: Set<HTMLAnchorElement>;

  constructor() {
    this.storage = new Storage();
    this.styleManager = new StyleManager();
    this.activeLinks = new Set();

    if (document.readyState === "complete") {
      this.checkNewTabOpen();
    } else {
      window.addEventListener("load", () => this.checkNewTabOpen());
    }
  }

  private async markLink(
    url: string,
    link: HTMLAnchorElement,
    record: LinkRecord,
  ): Promise<void> {
    if (!isMarkableLink(link)) return;
    if (link.classList.contains("rt-read")) return;

    log.debug(`Marking link: ${url}`);
    try {
      this.styleManager.markLink(link);
    } catch (error) {
      log.error(`Error marking link for: ${url}`, error);
    }
  }

  private async markAsRead(url: string): Promise<void> {
    log.debug(`Marking as read: ${url}`);
    await this.storage.set(url, {
      url,
      timestamp: Date.now(),
    });

    // 触发一个自定义事件来通知其他标签页
    this.triggerSyncEvent();
    await this.updateAllMatchingLinks(url);
  }

  private triggerSyncEvent(): void {
    // 使用 localStorage 触发跨标签页同步
    localStorage.setItem(
      CONSTANTS.SYNC_EVENT,
      JSON.stringify({ timestamp: Date.now() }),
    );
    localStorage.removeItem(CONSTANTS.SYNC_EVENT);
  }

  private bindEvents(): void {
    document.addEventListener("click", this.handleClick.bind(this));
    document.addEventListener("auxclick", this.handleClick.bind(this));
    window.addEventListener("storage", this.handleStorageEvent.bind(this));
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this),
    );

    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private handleClick(event: MouseEvent): void {
    if (event.type === "auxclick" && event.button !== 1) return;

    const target = (event.target as Element).closest("a") as HTMLAnchorElement;
    if (!target || !isMarkableLink(target)) return;

    if (
      (event.type === "auxclick" && event.button === 1) ||
      (event.type === "click" && !event.ctrlKey && !event.metaKey)
    ) {
      this.markAsRead(target.href);
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      log.debug("Page became visible, refreshing links");
      // Refresh all link states when page becomes visible
      setTimeout(() => this.refreshLinks(), 100);
    }
  }

  private checkNewTabOpen(): void {
    const currentUrl = window.location.href;
    const referrer = document.referrer;
    if (
      referrer &&
      (CONSTANTS.URL_PATTERNS.FORUM.test(currentUrl) ||
        CONSTANTS.URL_PATTERNS.KEYWORDS.some((keyword) =>
          currentUrl.includes(keyword),
        ) ||
        currentUrl.startsWith("magnet:"))
    ) {
      this.markAsRead(currentUrl);
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    log.debug("Storage event detected:", event.key);
    if (event.key !== CONSTANTS.SYNC_EVENT) return;
    try {
      // Refresh link states immediately, remove delay
      this.refreshLinks();
    } catch (error) {
      log.error("Storage update error:", error);
    }
  }

  private async handleMutations(mutations: MutationRecord[]): Promise<void> {
    let shouldUpdate = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldUpdate = true;
        break;
      }
    }
    if (shouldUpdate) {
      await this.updateNewlyAddedLinks();
    }
  }

  private async updateNewlyAddedLinks(): Promise<void> {
    const links = Array.from(document.querySelectorAll("a"));
    const newLinks = links.filter(
      (link) =>
        !this.activeLinks.has(link as HTMLAnchorElement) &&
        isMarkableLink(link as HTMLAnchorElement),
    );

    for (const link of newLinks) {
      this.activeLinks.add(link as HTMLAnchorElement);
    }

    await Promise.all(
      newLinks.map((link) => this.checkAndMarkLink(link as HTMLAnchorElement)),
    );
  }

  private async checkAndMarkLink(link: HTMLAnchorElement): Promise<void> {
    const url = link.href;
    try {
      const record = await this.storage.get(url);
      if (record) {
        await this.markLink(url, link, record);
      }
    } catch (error) {
      log.error(`Error retrieving data for: ${url}`, error);
    }
  }

  private async updateAllMatchingLinks(url: string): Promise<void> {
    log.debug(`Updating all matching links for: ${url}`);
    const links = Array.from(document.querySelectorAll(`a[href='${url}']`));
    const record = await this.storage.get(url);

    if (record) {
      await Promise.all(
        links.map((link) =>
          this.markLink(url, link as HTMLAnchorElement, record),
        ),
      );
    }
  }

  private refreshLinks(): void {
    log.debug("Refreshing all links");
    const allLinks = Array.from(this.activeLinks);
    allLinks.forEach((link) => {
      this.checkAndMarkLink(link);
    });
  }

  public initialize(): void {
    log.debug("Initializing script");
    this.styleManager.initialize();
    this.bindEvents();
    this.initActiveLinks();
    this.refreshLinks();
    log.debug("Initialization complete");
  }

  public cleanup(): void {
    this.styleManager.cleanup();
    this.activeLinks.clear();
  }

  private initActiveLinks() {
    this.activeLinks.clear();
    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      if (isMarkableLink(link as HTMLAnchorElement)) {
        this.activeLinks.add(link as HTMLAnchorElement);
      }
    });
    log.debug("Initialized active links:", this.activeLinks);
  }
}
