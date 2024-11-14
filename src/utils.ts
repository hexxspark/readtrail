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
  'data-time'?: string;
  'data-date-string'?: string;
  'data-time-string'?: string;
}


export function isMarkableLink(link: HTMLAnchorElement): boolean {
  return isForumThread(link) || isMagnetLink(link);
}


export function isMagnetLink(link: HTMLAnchorElement): boolean {
  if (!link?.href) return false;
  return link.href.startsWith("magnet:");
}

export function isForumThread(link: HTMLAnchorElement): boolean {
  // 基本检查
  if (!link?.href || !link.href.trim()) return false;
  
  const href = link.href.toLowerCase();
  
  // 排除文件链接
  if (CONSTANTS.URL_PATTERNS.EXCLUDE.test(href)) {
    return false;
  }

  // 检查是否是时间元素
  const isTimeElement = Boolean(
    link.querySelector('time') || 
    link.matches('time') ||
    isTimeAttributes(link)
  );

  if (isTimeElement) {
    return false;
  }

  // 获取链接所有文本内容，包括子元素
  const allText = getAllText(link);
  // 获取直接文本内容（不包括子元素）
  const directText = getDirectTextContent(link);
  
  // 如果直接文本内容是纯数字或日期，但有非空的子元素内容，不要排除
  const hasSignificantChildContent = directText.trim() !== allText.trim();

  // 排除条件
  if (
    // 只有在没有重要子元素内容的情况下才排除纯数字
    (!hasSignificantChildContent && /^\d+$/.test(directText)) ||
    // 只在文本内容太短且没有子元素的情况下排除
    (!hasSignificantChildContent && allText.length < CONSTANTS.MIN_TITLE_LENGTH) ||
    // 只在是纯日期且没有其他内容的情况下排除
    (!hasSignificantChildContent && isDateString(directText))
  ) {
    return false;
  }

  // 检查是否是元数据元素
  const isMetadata = link.closest(CONSTANTS.SELECTORS.METADATA_ELEMENTS) !== null;
  if (isMetadata && !hasSignificantChildContent) {
    return false;
  }

  // 检查是否在标题元素内
  const isTitleElement = link.closest(CONSTANTS.SELECTORS.TITLE_ELEMENTS) !== null;
  
  // 积极条件 - 增加了更多判断
  return (
    isTitleElement ||
    CONSTANTS.URL_PATTERNS.FORUM.test(href) ||
    href.includes('thread') ||
    (CONSTANTS.URL_PATTERNS.KEYWORDS.some(keyword => href.includes(keyword)) &&
     link.closest(CONSTANTS.SELECTORS.FORUM_ELEMENTS) !== null) ||
    // 新增：检查是否包含类似 [数字] 格式的主题ID
    /\[\d+\]/.test(allText) ||
    // 新增：检查是否是典型的论坛帖子URL格式（例如 thread-数字-数字-数字.html）
    /thread-\d+-\d+-\d+\.html?$/.test(href)
  );
}

// 辅助函数：获取元素的直接文本内容（不包括子元素）
function getDirectTextContent(element: HTMLElement): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  return text.trim();
}

// 辅助函数：获取元素的所有文本内容（包括子元素）
function getAllText(element: HTMLElement): string {
  return element.textContent?.trim() || '';
}

// 辅助函数：检查是否具有时间相关属性
function isTimeAttributes(element: HTMLElement): boolean {
  const timeAttributes: (keyof TimeAttributes)[] = [
    'datetime',
    'title',
    'data-time',
    'data-date-string',
    'data-time-string'
  ];

  const hasTimeAttribute = timeAttributes.some(attr => element.hasAttribute(attr));
  if (!hasTimeAttribute) return false;

  // 检查属性值是否符合日期格式
  return timeAttributes.some(attr => {
    const value = element.getAttribute(attr);
    return value && isDateString(value);
  });
}

// 辅助函数：检查文本是否是日期格式
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

  return datePatterns.some(pattern => pattern.test(text.trim()));
}