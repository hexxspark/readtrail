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

export function hashCode(str: string): number {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  return hash >>> 0; // Convert to unsigned 32-bit integer
}

interface TimeAttributes {
  datetime?: string;
  title?: string;
  "data-time"?: string;
  "data-date-string"?: string;
  "data-time-string"?: string;
}

export function isMarkableLink(link: HTMLAnchorElement): boolean {
  return isForumThread(link) || isMagnetLink(link);
}

export function isMagnetLink(link: HTMLAnchorElement): boolean {
  if (!link?.href) return false;
  return link.href.startsWith("magnet:");
}

export function isForumThread(link: HTMLAnchorElement): boolean {
  // Basic check
  if (!link?.href || !link.href.trim()) return false;

  const href = link.href.toLowerCase();

  // Exclude file links
  if (CONSTANTS.URL_PATTERNS.EXCLUDE.test(href)) {
    return false;
  }

  // Additional checks can be added here

  return true;
}
