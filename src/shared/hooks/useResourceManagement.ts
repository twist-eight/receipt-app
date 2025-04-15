// src/hooks/useResourceManagement.ts
import { useEffect, useRef } from "react";

export function useResourceManagement() {
  // Blob URLトラッキング用のRef
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // コンポーネントのアンマウント時に自動解放
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされるときに全てのBlobURLを解放
      revokeBlobUrls();
    };
  }, []);

  /**
   * 新しいBlobURLを作成し、トラッキング
   */
  const createAndTrackBlobUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.add(url);
    return url;
  };

  /**
   * 特定のBlobURLを解放
   */
  const revokeBlobUrl = (url: string) => {
    if (url && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      } catch (e) {
        console.error("Failed to revoke Blob URL:", e);
      }
    }
  };

  /**
   * 全てのBlobURLを解放
   */
  const revokeBlobUrls = () => {
    blobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Failed to revoke Blob URL:", e);
      }
    });
    blobUrlsRef.current.clear();
  };

  return {
    createAndTrackBlobUrl,
    revokeBlobUrl,
    revokeBlobUrls,
    trackedUrlsCount: () => blobUrlsRef.current.size,
  };
}
