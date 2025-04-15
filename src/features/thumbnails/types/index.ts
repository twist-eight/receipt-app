// サムネイル関連の型定義

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  backgroundColor?: string;
}

export interface ThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ThumbnailCache {
  id: string;
  dataUrl: string;
  createdAt: number;
}

// ストレージ関連の型
export interface StoredThumbnail {
  id: string;
  path: string;
  url?: string;
  width?: number;
  height?: number;
  format?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
