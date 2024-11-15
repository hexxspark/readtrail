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

  // Check if it's a time element
  const isTimeElement = Boolean(
      link.querySelector("time") ||
      link.matches("time") ||
      isTimeAttributes(link),
  );

  if (isTimeElement) {
    return false;
  }

  // Get all text content, including child elements
  const allText = getAllText(link);
  // Get direct text content (excluding child elements)
  const directText = getDirectTextContent(link);

  // If direct text is numbers or dates but has non-empty child content, don't exclude
  const hasSignificantChildContent = directText.trim() !== allText.trim();

  // Exclusion conditions
  if (
      // Only exclude pure numbers when there's no significant child content
      (!hasSignificantChildContent && /^\d+$/.test(directText)) ||
      // Only exclude when text is too short and has no child elements
      (!hasSignificantChildContent &&
          allText.length < CONSTANTS.MIN_TITLE_LENGTH) ||
      // Only exclude when it's pure date with no other content
      (!hasSignificantChildContent && isDateString(directText))
  ) {
    return false;
  }

  // Check if it's a metadata element
  const isMetadata =
      link.closest(CONSTANTS.SELECTORS.METADATA_ELEMENTS) !== null;
  if (isMetadata && !hasSignificantChildContent) {
    return false;
  }

  // Check if it's within a title element
  const isTitleElement =
      link.closest(CONSTANTS.SELECTORS.TITLE_ELEMENTS) !== null;

  // Positive conditions - with additional checks
  return (
      isTitleElement ||
      CONSTANTS.URL_PATTERNS.FORUM.test(href) ||
      href.includes("thread") ||
      (CONSTANTS.URL_PATTERNS.KEYWORDS.some((keyword) =>
              href.includes(keyword),
          ) &&
          link.closest(CONSTANTS.SELECTORS.FORUM_ELEMENTS) !== null) ||
      // New: Check if contains thread ID in [number] format
      /\[\d+\]/.test(allText) ||
      // New: Check if URL matches typical forum post format (e.g., thread-number-number-number.html)
      /thread-\d+-\d+-\d+\.html?$/.test(href)
  );
}

// Helper function: Get element's direct text content (excluding child elements)
function getDirectTextContent(element: HTMLElement): string {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  return text.trim();
}

// Helper function: Get element's all text content (including child elements)
function getAllText(element: HTMLElement): string {
  return element.textContent?.trim() || "";
}

// Helper function: Check if element has time-related attributes
function isTimeAttributes(element: HTMLElement): boolean {
  const timeAttributes: (keyof TimeAttributes)[] = [
    "datetime",
    "title",
    "data-time",
    "data-date-string",
    "data-time-string",
  ];

  const hasTimeAttribute = timeAttributes.some((attr) =>
      element.hasAttribute(attr),
  );
  if (!hasTimeAttribute) return false;

  // Check if attribute values match date format
  return timeAttributes.some((attr) => {
    const value = element.getAttribute(attr);
    return value && isDateString(value);
  });
}

// Helper function: Check if text matches date format
function isDateString(text: string): boolean {
  const datePatterns = [
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/,
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/,
    /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/,
    /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/,
    /^\d{4}年\d{1,2}月\d{1,2}日$/,
    /^\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?$/,
    /^(?:yesterday|today|tomorrow)$/i,
  ];

  return datePatterns.some((pattern) => pattern.test(text.trim()));
}