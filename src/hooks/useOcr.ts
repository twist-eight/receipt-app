// src/hooks/useOcr.ts - processMultipleReceipts を削除し、未使用の state と setter も削除

import { useState } from "react";
import {
  processImageWithOCR,
  OCRResult,
  OCROptions,
} from "../utils/ocrService";
import { ReceiptItem } from "../types/receipt";

interface UseOcrReturn {
  runOcr: (receipt: ReceiptItem, options?: OCROptions) => Promise<void>;
  applyOcrResults: (
    receiptId: string,
    results: OCRResult
  ) => Partial<ReceiptItem>;
  isProcessing: boolean;
  ocrResults: Record<string, OCRResult>;
  error: string | null;
}

export function useOcr(): UseOcrReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState<Record<string, OCRResult>>({});
  const [error, setError] = useState<string | null>(null);

  // OCR処理を実行する関数
  const runOcr = async (receipt: ReceiptItem, options: OCROptions = {}) => {
    if (!receipt.imageUrls || receipt.imageUrls.length === 0) {
      setError("OCR処理に必要な画像がありません");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 最初の画像を使用してOCR処理
      const imageUrl = receipt.imageUrls[0];
      const results = await processImageWithOCR(imageUrl, {
        documentType: receipt.type,
        ...options,
      });

      // 結果を保存
      setOcrResults((prev) => ({
        ...prev,
        [receipt.id]: results,
      }));
    } catch (err) {
      console.error("OCR処理中にエラーが発生しました:", err);
      setError(err instanceof Error ? err.message : "OCR処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  // OCR結果から更新データを作成
  const applyOcrResults = (
    receiptId: string,
    results: OCRResult
  ): Partial<ReceiptItem> => {
    const updates: Partial<ReceiptItem> = {};

    if (results.vendor) {
      updates.vendor = results.vendor;
    }

    if (results.date) {
      updates.date = results.date;
    }

    if (results.amount !== undefined) {
      updates.amount = results.amount;
    }

    if (results.text) {
      // メモにOCRのテキスト全体を入れる
      updates.memo = `OCR結果: ${results.text.substring(0, 200)}${
        results.text.length > 200 ? "..." : ""
      }`;
    }

    return updates;
  };

  return {
    runOcr,
    applyOcrResults,
    isProcessing,
    ocrResults,
    error,
  };
}
