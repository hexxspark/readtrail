export interface ReadState {
  timestamp: number;
  replyCount: number;
  note?: string;
}

export interface StorageData {
  [url: string]: ReadState;
}

export interface ThemeConfig {
  light: string;
  dark: string;
}

export interface StorageEvent {
  timestamp: number;
  key: string;
  data: StorageData;
}
