// src/hooks/useThumbnails.ts
import { useState } from "react";

export function useThumbnails() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 画像からサムネイルを生成する
   */
  const generateImageThumbnail = async (
    imageUrl: string,
    maxSize = 200
  ): Promise<string> => {
    try {
      setIsGenerating(true);
      setError(null);

      if (!imageUrl) {
        throw new Error("画像URLが指定されていません");
      }

      // 画像をロード
      const img = new Image();
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      });

      // キャンバスに描画してサイズを調整
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas 2D contextの取得に失敗しました");
      }

      // 適切なサイズにリサイズ
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // JPEG形式で圧縮して返す（品質0.7）
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      return dataUrl;
    } catch (err) {
      console.error("サムネイル生成エラー:", err);
      setError("サムネイルの生成に失敗しました");
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Blobデータからサムネイルを生成する
   */
  const generateBlobThumbnail = async (
    blob: Blob,
    maxSize = 200
  ): Promise<Blob> => {
    try {
      setIsGenerating(true);
      setError(null);

      // BlobからURLを作成
      const blobUrl = URL.createObjectURL(blob);

      // URLからサムネイルを生成
      const thumbnailDataUrl = await generateImageThumbnail(blobUrl, maxSize);

      // URLを解放
      URL.revokeObjectURL(blobUrl);

      // DataURLからBlobに変換
      const res = await fetch(thumbnailDataUrl);
      const thumbnailBlob = await res.blob();

      return thumbnailBlob;
    } catch (err) {
      console.error("Blobサムネイル生成エラー:", err);
      setError("サムネイルの生成に失敗しました");
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Base64をBlobに変換
   */
  const base64ToBlob = async (base64Data: string): Promise<Blob> => {
    try {
      const res = await fetch(base64Data);
      return await res.blob();
    } catch (err) {
      console.error("Base64->Blob変換エラー:", err);
      setError("データ変換に失敗しました");
      throw err;
    }
  };

  /**
   * BlobをBase64に変換
   */
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return {
    generateImageThumbnail,
    generateBlobThumbnail,
    base64ToBlob,
    blobToBase64,
    isGenerating,
    error,
  };
}
