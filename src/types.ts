export interface LinkEntry {
  url: string;
  timestamp: number;
  replyCount: number;
  note?: string;
}

export interface ThemeConfig {
  light: string;
  dark: string;
}

export interface StorageEvent {
  timestamp: number;
  key: string;
  data: History;
}
