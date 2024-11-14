import { Storage } from "./storage";
import { CONSTANTS } from "./constants";
import { isDarkMode, findReplyCount, isMarkableLink } from "./utils";
import type { LinkRecord } from "./types";

export class LinkMarker {
  private storage: Storage;
  private activeLinks: Set<HTMLAnchorElement>;
  private isDark: boolean;

  constructor() {
    this.storage = new Storage();
    this.activeLinks = new Set();
    this.isDark = isDarkMode();
    if (document.readyState === "complete") {
      this.checkNewTabOpen();
    } else {
      window.addEventListener("load", () => this.checkNewTabOpen());
    }
  }

  private initStyles(): void {
    console.debug("Initializing styles");
    const style = document.createElement("style");
    style.textContent = `
      .link-mark-highlighted {
        padding: 2px 4px !important;
        border-radius: 4px !important;
        border: 1px solid rgba(150, 150, 150, 0.8) !important;
        background-color: ${
          this.isDark
            ? CONSTANTS.STYLES.HIGHLIGHT.dark
            : CONSTANTS.STYLES.HIGHLIGHT.light
        } !important;
        transition: background-color 0.2s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    console.debug("Binding events");
    // Storage event
    window.addEventListener("storage", this.handleStorageEvent.bind(this));

    // Dynamic content observation
    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private checkNewTabOpen(): void {
    // Check if the current page was opened from another page
    const currentUrl = window.location.href;
    const referrer = document.referrer;
    if (
      referrer &&
      (CONSTANTS.URL_PATTERNS.FORUM.test(currentUrl) ||
        CONSTANTS.URL_PATTERNS.KEYWORDS.some((keyword) =>
          currentUrl.includes(keyword)
        ) ||
        currentUrl.startsWith("magnet:"))
    ) {
      const replyCount = findReplyCount(document.body);
      this.markAsRead(currentUrl, replyCount);
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    console.debug("Storage event detected:", event.key);
    if (event.key !== CONSTANTS.EVENT.STORAGE) return;
    try {
      const value = JSON.parse(event.newValue || "{}");
      console.debug("Parsed storage event data:", value);
      // Allow a small delay for the storage to update
      setTimeout(() => this.refreshLinks(), 100);
    } catch (error) {
      console.error("Storage update error:", error);
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
        isMarkableLink(link as HTMLAnchorElement)
    );

    for (const link of newLinks) {
      this.activeLinks.add(link as HTMLAnchorElement);
    }

    await Promise.all(
      newLinks.map((link) => this.checkAndMarkLink(link as HTMLAnchorElement))
    );
  }

  private async markAsRead(url: string, replyCount: number): Promise<void> {
    console.debug(`Marking as read: ${url} with reply count: ${replyCount}`);
    await this.storage.set(url, {
      url,
      timestamp: Date.now(),
      replyCount,
    });

    await this.updateAllMatchingLinks(url);
  }

  private async checkAndMarkLink(link: HTMLAnchorElement): Promise<void> {
    const url = link.href;
    try {
      const record = await this.storage.get(url);
      if (record) {
        await this.markLink(url, link, record);
      }
    } catch (error) {
      console.error(`Error retrieving data for: ${url}`, error);
    }
  }

  private async markLink(
    url: string,
    link: HTMLAnchorElement,
    record: LinkRecord
  ): Promise<void> {
    if (link.classList.contains("link-mark-highlighted")) {
      return;
    }

    console.debug(`Marking link: ${url}`);
    try {
      link.classList.add("link-mark-highlighted");
      link.title = `Read on ${new Date(
        record.timestamp
      ).toLocaleString()} - Replies: ${record.replyCount}${
        record.note ? ` - Note: ${record.note}` : ""
      }`;
    } catch (error) {
      console.error(`Error marking link for: ${url}`, error);
    }
  }

  private async updateAllMatchingLinks(url: string): Promise<void> {
    console.debug(`Updating all matching links for: ${url}`);
    const links = Array.from(document.querySelectorAll(`a[href='${url}']`));
    const record = await this.storage.get(url);

    if (record) {
      await Promise.all(
        links.map((link) =>
          this.markLink(url, link as HTMLAnchorElement, record)
        )
      );
    }
  }

  private refreshLinks(): void {
    console.debug("Refreshing links");
    this.activeLinks.forEach((link) => {
      this.checkAndMarkLink(link);
    });
  }

  public initialize(): void {
    console.debug("Initializing script");
    this.initStyles();
    this.bindEvents();
    this.initializeActiveLinks();
    this.refreshLinks();
    console.debug("Initialization complete");
  }

  private initializeActiveLinks() {
    this.activeLinks.clear();
    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      if (isMarkableLink(link as HTMLAnchorElement)) {
        this.activeLinks.add(link as HTMLAnchorElement);
      }
    });
    console.debug("Initialized active links:", this.activeLinks);
  }
}
