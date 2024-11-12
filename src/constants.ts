export const CONSTANTS = {
  STORAGE_PREFIX: "LinkMark_",
  SELECTORS: {
    FORUM_ELEMENTS:
      ".thread, .post, .topic, .discussion, .forum, .message, .entry, .comment",
    REPLY_COUNTS:
      ".reply_count, .replies, .comment-count, .post-count, .response-count",
  },
  URL_PATTERNS: {
    FORUM: /\/(?:t|threads|topic|post|p|thread|view|discussion)\//,
    KEYWORDS: ["thread", "topic", "view"] as const,
  },
  EVENTS: {
    UPDATE: "linkMarkUpdate",
    STORAGE: "LinkMark_Update",
  },
  STYLES: {
    HIGHLIGHT: {
      light: "rgba(240, 240, 240, 1)",
      dark: "rgba(1, 1, 1, 0.4)",
    },
  },
} as const;
