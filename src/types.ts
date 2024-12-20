export interface LinkRecord {
  url: string;
  timestamp: number;
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
