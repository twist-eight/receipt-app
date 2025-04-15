// サムネイル生成・管理のためのサービス
import { supabase } from "../../../lib/supabaseClient";
import { ThumbnailOptions, StoredThumbnail } from "../types";
import * as imageUtils from "../utils/imageUtils";

/**
 * 画像URLからサムネイルを生成
 */
export async function generateThumbnail(
  imageUrl: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  try {
    // 画像をロード
    const img = await imageUtils.loadImage(imageUrl);

    // キャンバスにリサイズして描画
    const canvas = imageUtils.resizeImageToCanvas(img, options);

    // DataURLとして返す
    return imageUtils.canvasToDataURL(canvas, options);
  } catch (error) {
    console.error("サムネイル生成エラー:", error);
    throw new Error("サムネイルの生成に失敗しました");
  }
}

/**
 * ファイルからサムネイルを生成
 */
export async function generateThumbnailFromFile(
  file: File,
  options: ThumbnailOptions = {}
): Promise<string> {
  try {
    // FileをURLに変換
    const url = URL.createObjectURL(file);

    try {
      // サムネイル生成
      return await generateThumbnail(url, options);
    } finally {
      // 一時URLの解放
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("ファイルからのサムネイル生成エラー:", error);
    throw new Error("ファイルからのサムネイル生成に失敗しました");
  }
}

/**
 * サムネイルをSupabaseストレージに保存
 */
export async function storeThumbnail(
  clientId: string,
  thumbnailDataUrl: string,
  fileId: string,
  metadata: Record<string, unknown> = {}
): Promise<StoredThumbnail | null> {
  try {
    if (!thumbnailDataUrl.startsWith("data:image/")) {
      throw new Error("無効なサムネイルデータです");
    }

    // DataURLをBlobに変換
    const blob = await imageUtils.dataURLToBlob(thumbnailDataUrl);
    const fileSize = blob.size;

    // ファイル名を生成
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `thumbnail_${dateStr}_${fileId}.jpg`;
    const filePath = `clients/${clientId}/thumbnails/${fileName}`;

    // Supabaseにアップロード
    const { error } = await supabase.storage
      .from("receipts")
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("サムネイルアップロードエラー:", error);
      return null;
    }

    // 正常に保存できた場合はメタデータを返す
    return {
      id: fileId,
      path: filePath,
      createdAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        size: fileSize,
      },
    };
  } catch (error) {
    console.error("サムネイル保存エラー:", error);
    return null;
  }
}

/**
 * 保存済みサムネイルのURLを取得
 */
export async function getThumbnailUrl(path: string): Promise<string | null> {
  try {
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 1週間有効

    if (error || !data) {
      console.error("サムネイルURL取得エラー:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("サムネイルURL取得エラー:", error);
    return null;
  }
}

/**
 * セッションストレージにサムネイルを一時保存
 */
export function cacheThumbnail(id: string, dataUrl: string): void {
  try {
    sessionStorage.setItem(`thumbnail_${id}`, dataUrl);
  } catch (error) {
    console.error("サムネイルキャッシュエラー:", error);
  }
}

/**
 * セッションストレージからサムネイルを取得
 */
export function getCachedThumbnail(id: string): string | null {
  try {
    return sessionStorage.getItem(`thumbnail_${id}`);
  } catch (error) {
    console.error("キャッシュサムネイル取得エラー:", error);
    return null;
  }
}

/**
 * サムネイルキャッシュをクリア
 */
export function clearCachedThumbnail(id: string): void {
  try {
    sessionStorage.removeItem(`thumbnail_${id}`);
  } catch (error) {
    console.error("サムネイルキャッシュクリアエラー:", error);
  }
}
