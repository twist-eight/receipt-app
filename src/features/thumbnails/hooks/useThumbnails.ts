import { useState, useCallback } from "react";
import * as thumbnailService from "../services/thumbnailService";
import { ThumbnailOptions } from "../types";

export function useThumbnails() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * 画像URLからサムネイルを生成
   */
  const generateThumbnail = useCallback(
    async (
      imageUrl: string,
      options: ThumbnailOptions = {}
    ): Promise<string> => {
      try {
        setIsGenerating(true);
        setError(null);
        setProgress(10);

        if (!imageUrl) {
          throw new Error("画像URLが指定されていません");
        }

        setProgress(30);
        const result = await thumbnailService.generateThumbnail(
          imageUrl,
          options
        );
        setProgress(100);

        return result;
      } catch (err) {
        console.error("サムネイル生成エラー:", err);
        setError("サムネイルの生成に失敗しました");
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * ファイルからサムネイルを生成
   */
  const generateThumbnailFromFile = useCallback(
    async (file: File, options: ThumbnailOptions = {}): Promise<string> => {
      try {
        setIsGenerating(true);
        setError(null);
        setProgress(10);

        const result = await thumbnailService.generateThumbnailFromFile(
          file,
          options
        );
        setProgress(100);

        return result;
      } catch (err) {
        console.error("ファイルからのサムネイル生成エラー:", err);
        setError("サムネイルの生成に失敗しました");
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * サムネイルをストレージに保存
   */
  const storeThumbnail = useCallback(
    async (
      clientId: string,
      thumbnailDataUrl: string,
      fileId: string,
      metadata: Record<string, unknown> = {}
    ) => {
      try {
        setIsGenerating(true);
        setProgress(20);

        // ストレージに保存
        const result = await thumbnailService.storeThumbnail(
          clientId,
          thumbnailDataUrl,
          fileId,
          metadata
        );

        setProgress(100);
        return result;
      } catch (err) {
        console.error("サムネイル保存エラー:", err);
        setError("サムネイルの保存に失敗しました");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * セッションストレージとの連携機能
   */
  const cacheThumbnail = useCallback((id: string, dataUrl: string): void => {
    thumbnailService.cacheThumbnail(id, dataUrl);
  }, []);

  const getCachedThumbnail = useCallback((id: string): string | null => {
    return thumbnailService.getCachedThumbnail(id);
  }, []);

  const clearCachedThumbnail = useCallback((id: string): void => {
    thumbnailService.clearCachedThumbnail(id);
  }, []);

  return {
    generateThumbnail,
    generateThumbnailFromFile,
    storeThumbnail,
    cacheThumbnail,
    getCachedThumbnail,
    clearCachedThumbnail,
    isGenerating,
    progress,
    error,
    setError,
  };
}
