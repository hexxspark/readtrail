import { Storage } from "./storage";
import { CONSTANTS } from "./constants";
import {
  isDarkMode,
  findReplyCount,
  isForumThread,
  isMagnetLink,
} from "./utils";
import { History, LinkEntry } from "./types";

const RIGHT_CLICK_KEY = "linkmark:right-click";
const DEFAULT_OPEN_TIMEOUT = 10000; // Default time limit is 10 seconds

export class LinkMarker {
  private storage: Storage;
  private activeLinks: Set<HTMLAnchorElement>;
  private isDark: boolean;
  private openTimeLimit: number;

  constructor(openTimeout: number = DEFAULT_OPEN_TIMEOUT) {
    this.storage = new Storage();
    this.activeLinks = new Set();
    this.isDark = isDarkMode();
    this.openTimeLimit = openTimeout;

    if (document.readyState === "complete") {
      this.checkNewTabOpen();
    } else {
      window.addEventListener("load", () => this.checkNewTabOpen());
    }
  }

  private initStyles(): void {
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
    // Click event handling
    document.addEventListener("click", this.handleClick.bind(this));
    document.addEventListener("auxclick", this.handleClick.bind(this));
    document.addEventListener("contextmenu", this.handleContextMenu.bind(this));

    // Storage event
    window.addEventListener("storage", this.handleStorageEvent.bind(this));

    // Dynamic content observation
    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private handleClick(event: MouseEvent): void {
    if (event.type === "auxclick" && event.button !== 1) return;

    const target = (event.target as Element).closest("a") as HTMLAnchorElement;
    if (!target || (!isForumThread(target) && !isMagnetLink(target))) return;

    // Middle click or normal click
    if (
      (event.type === "auxclick" && event.button === 1) ||
      (event.type === "click" && !event.ctrlKey && !event.metaKey)
    ) {
      const replyCount = findReplyCount(target);
      this.markAsRead(target.href, replyCount);
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    const target = (event.target as Element).closest("a") as HTMLAnchorElement;
    if (!target || (!isForumThread(target) && !isMagnetLink(target))) return;

    // Record right-clicked link information
    localStorage.setItem(
      RIGHT_CLICK_KEY,
      JSON.stringify({
        url: target.href,
        time: Date.now(),
        replyCount: findReplyCount(target),
      })
    );
  }

  private checkNewTabOpen(): void {
    // Check if the new tab was opened from the right-click menu
    const rightClickData = localStorage.getItem(RIGHT_CLICK_KEY);
    if (rightClickData) {
      try {
        const { url, time, replyCount } = JSON.parse(rightClickData);
        // Check if the current URL matches and was opened within the configured time limit
        if (
          url === window.location.href &&
          Date.now() - time < this.openTimeLimit
        ) {
          this.markAsRead(url, replyCount);
          localStorage.removeItem(RIGHT_CLICK_KEY);
          return;
        } else {
          console.log(`LinkMark: Timeout exceeded for URL ${url}`);
        }
      } catch (e) {
        console.error("Failed to parse right click data:", e);
      }
    }

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
      const { key, data } = JSON.parse(event.newValue || "{}");
      console.debug("Parsed storage event data:", { key, data });

      setTimeout(() => {
        this.refreshHighlights();
      }, 500);
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
    const newLinks = links.filter(link => 
      !this.activeLinks.has(link as HTMLAnchorElement) &&
      (isForumThread(link as HTMLAnchorElement) || isMagnetLink(link as HTMLAnchorElement))
    );

    for (const link of newLinks) {
      this.activeLinks.add(link as HTMLAnchorElement);
    }

    await Promise.all(newLinks.map(link => this.checkAndHighlightLink(link as HTMLAnchorElement)));
  }

  private async markAsRead(url: string, replyCount: number): Promise<void> {
    console.debug(`Marking as read: ${url} with reply count: ${replyCount}`);
    await this.storage.set(url, {
      url,
      timestamp: Date.now(),
      replyCount,
      note: "",
    });

    await this.updateAllMatchingLinks(url);
  }

  private async checkAndHighlightLink(link: HTMLAnchorElement): Promise<void> {
    const url = link.href;
    try {
      const entry = await this.storage.get(url);
      if (entry) {
        await this.highlightLink(url, link, entry);
      } else {
        console.debug(`No data found for: ${url}`);
      }
    } catch (error) {
      console.error(`Error retrieving data for: ${url}`, error);
    }
  }

  private async highlightLink(url: string, link: HTMLAnchorElement, entry: LinkEntry): Promise<void> {
    console.debug(`Highlighting link: ${url}`);
    try {
      link.classList.add("link-mark-highlighted");
      link.title = `Read on ${new Date(
        entry.timestamp
      ).toLocaleString()} - Replies: ${entry.replyCount}${
        entry.note ? ` - Note: ${entry.note}` : ""
      }`;
    } catch (error) {
      console.error(`Error highlighting link for: ${url}`, error);
    }
  }

  private async updateAllMatchingLinks(url: string): Promise<void> {
    console.debug(`Updating all matching links for: ${url}`);
    const links = Array.from(document.querySelectorAll(`a[href='${url}']`));
    const entry = await this.storage.get(url);

    if (entry) {
      await Promise.all(links.map(link => this.highlightLink(url, link as HTMLAnchorElement, entry)));
    }
  }

  private refreshHighlights(): void {
    console.debug("Refreshing highlights");
    this.activeLinks.forEach((link) => {
      this.checkAndHighlightLink(link);
    });
  }

  public initialize(): void {
    console.debug("Initializing script");
    this.initStyles();
    this.bindEvents();

    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      if (
        isForumThread(link as HTMLAnchorElement) ||
        isMagnetLink(link as HTMLAnchorElement)
      ) {
        console.debug(`[Initializing] Found link to highlight: ${link.href}`);
        this.activeLinks.add(link as HTMLAnchorElement);
        this.checkAndHighlightLink(link as HTMLAnchorElement);
      }
    });
  }
}
