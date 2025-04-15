// サムネイル生成や画像操作のためのユーティリティ関数
import { ThumbnailOptions } from "../types";

/**
 * 画像データのURLをBase64に変換
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("画像のBase64変換に失敗:", error);
    throw new Error("画像の変換に失敗しました");
  }
}

/**
 * HTMLImageElement要素を作成して画像をロード
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // CORS対応

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));

    img.src = src;
  });
}

/**
 * 画像をリサイズしてキャンバスに描画
 */
export function resizeImageToCanvas(
  img: HTMLImageElement,
  options: ThumbnailOptions = {}
): HTMLCanvasElement {
  const {
    maxWidth = 400,
    maxHeight = 400,
    backgroundColor = "#ffffff",
  } = options;

  // アスペクト比を維持したサイズ計算
  const aspectRatio = img.width / img.height;
  let width, height;

  if (aspectRatio > 1) {
    // 横長の場合
    width = Math.min(maxWidth, img.width);
    height = width / aspectRatio;
  } else {
    // 縦長の場合
    height = Math.min(maxHeight, img.height);
    width = height * aspectRatio;
  }

  // キャンバスの作成
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D contextの取得に失敗しました");
  }

  // 高品質描画の設定
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 背景を指定色で塗りつぶす
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // 画像を描画
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

/**
 * Canvasを指定フォーマットのDataURLに変換
 */
export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  options: ThumbnailOptions = {}
): string {
  const { format = "jpeg", quality = 0.85 } = options;
  const mimeType = `image/${format}`;
  return canvas.toDataURL(mimeType, quality);
}

/**
 * DataURLをBlobに変換
 */
export async function dataURLToBlob(dataURL: string): Promise<Blob> {
  try {
    const response = await fetch(dataURL);
    return await response.blob();
  } catch (error) {
    console.error("DataURL→Blob変換エラー:", error);
    throw new Error("DataURLの変換に失敗しました");
  }
}

/**
 * BlobをDataURLに変換
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * DataURLからサイズ(バイト)を概算
 */
export function estimateDataURLSize(dataURL: string): number {
  // Base64部分のサイズを計算
  const base64 = dataURL.split(",")[1];
  if (!base64) return 0;

  // Base64は4文字で3バイトを表現するので、およそ0.75を掛ける
  return Math.round(base64.length * 0.75);
}
