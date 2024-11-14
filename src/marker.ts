import { Storage } from "./storage";
import { CONSTANTS } from "./constants";
import { isMarkableLink } from "./utils";
import type { LinkRecord } from "./types";
import log from "./logger";

const STYLES = {
  LINK_MARK: `
    .linkmark-read {
      display: inline !important;
      padding: 1px 4px !important;
      margin: 2px 0 !important;
      border-radius: 4px !important;
      background-color: var(--linkmark-bg-color, rgba(0, 0, 0, 0.08)) !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
      vertical-align: text-top !important;
      text-decoration: none !important;
      line-height: 1.2 !important;
    }

    .linkmark-read[style*="display: block"],
    .linkmark-read[style*="display:block"] {
      display: inline !important;
    }
  `,
};

export class LinkMarker {
  private storage: Storage;
  private activeLinks: Set<HTMLAnchorElement>;

  constructor() {
    this.storage = new Storage();
    this.activeLinks = new Set();
    if (document.readyState === "complete") {
      this.checkNewTabOpen();
    } else {
      window.addEventListener("load", () => this.checkNewTabOpen());
    }
  }

  private getBgColor(element: HTMLElement): string {
    const backgroundColor = window.getComputedStyle(element).backgroundColor;
    if (
      backgroundColor === "rgba(0, 0, 0, 0)" ||
      backgroundColor === "transparent"
    ) {
      return element.parentElement
        ? this.getBgColor(element.parentElement)
        : window.getComputedStyle(document.body).backgroundColor;
    }
    return backgroundColor;
  }

  private getLuminance(color: string): number {
    const rgb = color.match(/\d+/g)?.map(Number) || [255, 255, 255];
    const [r, g, b] = rgb.map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private getContrastColor(bgColor: string): string {
    const luminance = this.getLuminance(bgColor);
    return luminance > 0.5 ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
  }

  private initStyles(): void {
    log.debug("Initializing styles");
    const style = document.createElement("style");
    style.textContent = STYLES.LINK_MARK;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    document.addEventListener("click", this.handleClick.bind(this));
    document.addEventListener("auxclick", this.handleClick.bind(this));
    window.addEventListener("storage", this.handleStorageEvent.bind(this));

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

  private checkNewTabOpen(): void {
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
      this.markAsRead(currentUrl);
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    log.debug("Storage event detected:", event.key);
    if (event.key !== CONSTANTS.EVENT.STORAGE) return;
    try {
      const value = JSON.parse(event.newValue || "{}");
      log.debug("Parsed storage event data:", value);
      setTimeout(() => this.refreshLinks(), 100);
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
        isMarkableLink(link as HTMLAnchorElement)
    );

    for (const link of newLinks) {
      this.activeLinks.add(link as HTMLAnchorElement);
    }

    await Promise.all(
      newLinks.map((link) => this.checkAndMarkLink(link as HTMLAnchorElement))
    );
  }

  private async markAsRead(url: string): Promise<void> {
    log.debug(`Marking as read: ${url}`);
    await this.storage.set(url, {
      url,
      timestamp: Date.now(),
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
      log.error(`Error retrieving data for: ${url}`, error);
    }
  }

  private async markLink(
    url: string,
    link: HTMLAnchorElement,
    record: LinkRecord
  ): Promise<void> {
    if (link.classList.contains('linkmark-read')) return;

    log.debug(`Marking link: ${url}`);
    try {
      const bgColor = this.getBgColor(link);
      const luminance = this.getLuminance(bgColor);
      const backgroundColor = luminance > 0.5 
        ? 'rgba(0, 0, 0, 0.08)'  
        : 'rgba(255, 255, 255, 0.08)';

      const computedStyle = window.getComputedStyle(link);
      if (computedStyle.display === 'block') {
        link.style.display = 'inline-block';
      }

      link.style.setProperty('--linkmark-bg-color', backgroundColor);
      link.classList.add("linkmark-read");
    } catch (error) {
      log.error(`Error marking link for: ${url}`, error);
    }
  }

  private async updateAllMatchingLinks(url: string): Promise<void> {
    log.debug(`Updating all matching links for: ${url}`);
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
    // 只刷新未标记的链接
    const unreadLinks = Array.from(this.activeLinks).filter(
      (link) => !link.classList.contains("linkmark-read")
    );
    unreadLinks.forEach((link) => {
      this.checkAndMarkLink(link);
    });
  }

  public initialize(): void {
    log.debug("Initializing script");
    this.initStyles();
    this.bindEvents();
    this.initActiveLinks();
    this.refreshLinks();
    log.debug("Initialization complete");
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
