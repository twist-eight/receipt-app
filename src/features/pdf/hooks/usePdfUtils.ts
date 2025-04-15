// src/hooks/usePdfUtils.ts
import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// PDFワーカーの設定
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export function usePdfUtils() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * PDFページを画像に変換する
   */
  const pdfPageToImage = async (
    pdfData: Uint8Array,
    pageIndex: number,
    scale: number = 1.5
  ): Promise<string> => {
    try {
      setIsProcessing(true);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context could not be created");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/jpeg");
    } catch (err) {
      console.error("Error converting PDF to image:", err);
      setError("PDFから画像への変換に失敗しました");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * PDFの全ページを画像に変換する
   */
  const pdfToImages = async (pdfData: Uint8Array): Promise<string[]> => {
    try {
      setIsProcessing(true);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const totalPages = pdf.numPages;
      const imageUrls: string[] = [];

      for (let i = 0; i < totalPages; i++) {
        const imageUrl = await pdfPageToImage(pdfData, i);
        imageUrls.push(imageUrl);
      }

      return imageUrls;
    } catch (err) {
      console.error("Error converting PDF to images:", err);
      setError("PDFから画像への変換に失敗しました");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * PDF情報を取得する（ページ数など）
   */
  const getPdfInfo = async (
    pdfData: Uint8Array
  ): Promise<{ pageCount: number; metadata: Record<string, unknown> }> => {
    try {
      setIsProcessing(true);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const metadata = await pdf.getMetadata();

      return {
        pageCount: pdf.numPages,
        metadata: metadata,
      };
    } catch (err) {
      console.error("Error getting PDF info:", err);
      setError("PDF情報の取得に失敗しました");
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    pdfPageToImage,
    pdfToImages,
    getPdfInfo,
    isProcessing,
    error,
  };
}
