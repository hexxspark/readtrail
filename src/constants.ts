export const CONSTANTS = {
  STORAGE_PREFIX: "linkmark:",
  SELECTORS: {
    FORUM_ELEMENTS: ".thread, .post, .topic, .discussion, .forum, .message, .entry, .comment",
    REPLY_COUNTS: ".reply_count, .replies, .comment-count, .post-count, .response-count",
    METADATA_ELEMENTS: ".date, .timestamp, .views, .reads, .new-post, .new-reply, .status-icon",
    TITLE_ELEMENTS: ".thread-title, .topic-title, .post-title, .subject",
  },
  URL_PATTERNS: {
    // 增加了更多的论坛 URL 模式
    FORUM: /\/(?:t|threads|topic|post|p|thread|view|discussion)|thread-.*\.html?$/i,
    KEYWORDS: ["thread", "topic", "view", "forum", "discussion"] as const,
    EXCLUDE: /\.(jpg|jpeg|png|gif|webp|css|js|json|xml)$/i,
  },
  MIN_TITLE_LENGTH: 5, // 降低最小长度要求，因为有些标题可能比较短
  EVENT: {
    STORAGE: "linkmark:storage",
  }
} as const;