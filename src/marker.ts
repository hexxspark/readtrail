import { Storage } from './storage';
import { CONSTANTS } from './constants';
import { isDarkMode, findReplyCount, isForumThread, isMagnetLink } from './utils';

export class LinkMarker {
  private storage: Storage;
  private activeLinks: Set<HTMLAnchorElement>;
  private isDark: boolean;

  constructor() {
    this.storage = new Storage();
    this.activeLinks = new Set();
    this.isDark = isDarkMode();
  }

  private initStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .link-mark-highlighted {
        padding: 2px 4px !important;
        border-radius: 4px !important;
        border: 1px solid rgba(150, 150, 150, 0.8) !important;
        background-color: ${this.isDark ? CONSTANTS.STYLES.HIGHLIGHT.dark : CONSTANTS.STYLES.HIGHLIGHT.light} !important;
        transition: background-color 0.2s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    // 点击事件处理
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('auxclick', this.handleClick.bind(this));
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    // 存储事件
    window.addEventListener('storage', this.handleStorageEvent.bind(this));

    // 动态内容监听
    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, { childList: true, subtree: true });

    // 页面加载检查
    if (document.readyState === 'complete') {
      this.checkNewTabOpen();
    } else {
      window.addEventListener('load', () => this.checkNewTabOpen());
    }
  }

  private handleClick(event: MouseEvent): void {
    if (event.type === 'auxclick' && event.button !== 1) return;

    const target = (event.target as Element).closest('a') as HTMLAnchorElement;
    if (!target || (!isForumThread(target) && !isMagnetLink(target))) return;

    // 中键点击或普通点击
    if ((event.type === 'auxclick' && event.button === 1) ||
      (event.type === 'click' && !event.ctrlKey && !event.metaKey)) {
      const replyCount = findReplyCount(target);
      this.markAsRead(target.href, replyCount);
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    const target = (event.target as Element).closest('a') as HTMLAnchorElement;
    if (!target || (!isForumThread(target) && !isMagnetLink(target))) return;

    // 记录右键点击的链接信息
    sessionStorage.setItem('LinkMark_RightClick', JSON.stringify({
      url: target.href,
      time: Date.now(),
      replyCount: findReplyCount(target)
    }));
  }

  private checkNewTabOpen(): void {
    // 检查是否是从右键菜单打开的新标签页
    const rightClickData = sessionStorage.getItem('LinkMark_RightClick');
    if (rightClickData) {
      try {
        const { url, time, replyCount } = JSON.parse(rightClickData);
        // 检查当前URL是否匹配，且在5秒内打开的
        if (url === window.location.href && (Date.now() - time) < 5000) {
          this.markAsRead(url, replyCount);
          sessionStorage.removeItem('LinkMark_RightClick');
          return;
        }
      } catch (e) {
        console.error('Failed to parse right click data:', e);
      }
    }

    // 检查是否是从其他页面打开的
    const currentUrl = window.location.href;
    const referrer = document.referrer;
    if (referrer && (
      CONSTANTS.URL_PATTERNS.FORUM.test(currentUrl) ||
      CONSTANTS.URL_PATTERNS.KEYWORDS.some(keyword => currentUrl.includes(keyword)) ||
      currentUrl.startsWith('magnet:')
    )) {
      const replyCount = findReplyCount(document.body);
      this.markAsRead(currentUrl, replyCount);
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (event.key !== CONSTANTS.EVENTS.STORAGE) return;
    try {
      const { key, data } = JSON.parse(event.newValue || '{}');
      this.refreshHighlights();
    } catch (error) {
      console.error('Storage update error:', error);
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    let shouldUpdate = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldUpdate = true;
        break;
      }
    }
    if (shouldUpdate) {
      this.updateNewlyAddedLinks();
    }
  }

  private updateNewlyAddedLinks(): void {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (!this.activeLinks.has(link as HTMLAnchorElement) &&
        (isForumThread(link as HTMLAnchorElement) || isMagnetLink(link as HTMLAnchorElement))) {
        this.activeLinks.add(link as HTMLAnchorElement);
        this.checkAndHighlightLink(link as HTMLAnchorElement);
      }
    });
  }

  private markAsRead(url: string, replyCount: number): void {
    this.storage.set(url, {
      timestamp: Date.now(),
      replyCount,
      note: ''
    });

    this.updateAllMatchingLinks(url);
  }

  private checkAndHighlightLink(link: HTMLAnchorElement): void {
    const url = link.href;
    const data = this.storage.get(url)[url];
    if (data) {
      this.highlightLink(url, link);
    }
  }

  private highlightLink(url: string, link: HTMLAnchorElement): void {
    const data = this.storage.get(url)[url];
    if (!data) return;

    link.classList.add('link-mark-highlighted');
    link.title = `Read on ${new Date(data.timestamp).toLocaleString()} - Replies: ${data.replyCount}${data.note ? ` - Note: ${data.note}` : ''}`;
  }

  private updateAllMatchingLinks(url: string): void {
    const links = document.querySelectorAll(`a[href='${url}']`);
    links.forEach(link => {
      this.highlightLink(url, link as HTMLAnchorElement);
      if (!this.activeLinks.has(link as HTMLAnchorElement)) {
        this.activeLinks.add(link as HTMLAnchorElement);
      }
    });
  }

  private refreshHighlights(): void {
    this.activeLinks.forEach(link => {
      this.checkAndHighlightLink(link);
    });
  }

  public initialize(): void {
    this.initStyles();
    this.bindEvents();

    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (isForumThread(link as HTMLAnchorElement) || isMagnetLink(link as HTMLAnchorElement)) {
        this.activeLinks.add(link as HTMLAnchorElement);
        this.checkAndHighlightLink(link as HTMLAnchorElement);
      }
    });
  }
}