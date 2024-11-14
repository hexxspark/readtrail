import { CONSTANTS } from "./constants";

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    const a = document.createElement("a");
    a.href = url;
    return a.hostname;
  }
}

export function isDarkMode(): boolean {
  const bgcolor = getComputedStyle(document.body).backgroundColor;
  const match = bgcolor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;
  const [, r, g, b] = match.map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 100;
}

export function findReplyCount(element: HTMLElement): number {
  const container = element.closest(CONSTANTS.SELECTORS.FORUM_ELEMENTS);
  const countElement = container?.querySelector(
    CONSTANTS.SELECTORS.REPLY_COUNTS
  );
  return countElement ? parseInt(countElement.textContent || "0") || 0 : 0;
}

export function isForumThread(link: HTMLAnchorElement): boolean {
  return (
    CONSTANTS.URL_PATTERNS.FORUM.test(link.href) ||
    CONSTANTS.URL_PATTERNS.KEYWORDS.some((keyword) =>
      link.href.includes(keyword)
    ) ||
    link.closest(CONSTANTS.SELECTORS.FORUM_ELEMENTS) !== null
  );
}

export function isMagnetLink(link: HTMLAnchorElement): boolean {
  return link.href.startsWith("magnet:");
}

export function isMarkableLink(link: HTMLAnchorElement): boolean {
  return isForumThread(link) || isMagnetLink(link);
}

export function hashCode(str: string): number {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  return hash >>> 0; // Convert to unsigned 32-bit integer
}
