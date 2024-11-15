export const CONSTANTS = {
  PREFIX: "@rt:",
  SYNC_EVENT: "@rt:sync",
  SELECTORS: {
    FORUM_ELEMENTS:
      ".thread, .post, .topic, .discussion, .forum, .message, .entry, .comment",
    REPLY_COUNTS:
      ".reply_count, .replies, .comment-count, .post-count, .response-count",
    METADATA_ELEMENTS:
      ".date, .timestamp, .views, .reads, .new-post, .new-reply, .status-icon",
    TITLE_ELEMENTS: ".thread-title, .topic-title, .post-title, .subject",
  },
  URL_PATTERNS: {
    // Added more forum URL patterns
    FORUM:
      /\/(?:t|threads|topic|post|p|thread|view|discussion)|thread-.*\.html?$/i,
    KEYWORDS: ["thread", "topic", "view", "forum", "discussion"] as const,
    EXCLUDE: /\.(jpg|jpeg|png|gif|webp|css|js|json|xml)$/i,
  },
  // Lowered the minimum length requirement as some titles may be shorter
  MIN_TITLE_LENGTH: 5,
} as const;
