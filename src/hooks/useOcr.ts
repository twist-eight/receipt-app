// src/hooks/useOcr.ts
// 既に削除されている processMultipleReceipts を再追加します

import { useState } from "react";
import {
  processImageWithOCR,
  OCRResult,
  OCROptions,
} from "../utils/ocrService";
import { ReceiptItem } from "../types/receipt";

interface UseOcrReturn {
  runOcr: (receipt: ReceiptItem, options?: OCROptions) => Promise<void>;
  processMultipleReceipts: (
    receipts: ReceiptItem[],
    options?: OCROptions
  ) => Promise<void>;
  applyOcrResults: (
    receiptId: string,
    results: OCRResult
  ) => Partial<ReceiptItem>;
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  ocrResults: Record<string, OCRResult>;
  error: string | null;
}

export function useOcr(): UseOcrReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
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

  // 複数の受領書を処理する関数を追加
  const processMultipleReceipts = async (
    receipts: ReceiptItem[],
    options: OCROptions = {}
  ) => {
    if (receipts.length === 0) {
      setError("処理する受領書がありません");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);
    setTotalCount(receipts.length);

    const newResults: Record<string, OCRResult> = {};
    let hasError = false;

    try {
      // 直列処理（並列処理するとAPIの制限に引っかかる可能性があるため）
      for (let i = 0; i < receipts.length; i++) {
        const receipt = receipts[i];

        if (!receipt.imageUrls || receipt.imageUrls.length === 0) {
          console.warn(`Receipt ${receipt.id} has no images, skipping.`);
          continue;
        }

        try {
          const imageUrl = receipt.imageUrls[0];
          const result = await processImageWithOCR(imageUrl, {
            documentType: receipt.type,
            ...options,
          });

          newResults[receipt.id] = result;
          setProcessedCount(i + 1);
        } catch (err) {
          console.error(
            `OCR processing failed for receipt ${receipt.id}:`,
            err
          );
          hasError = true;
          // エラーがあっても処理を続行
        }
      }

      setOcrResults((prev) => ({
        ...prev,
        ...newResults,
      }));

      if (hasError) {
        setError(
          "一部の処理で問題が発生しました。詳細はコンソールを確認してください。"
        );
      }
    } catch (err) {
      console.error("複数受領書の処理中にエラーが発生:", err);
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
    processMultipleReceipts,
    applyOcrResults,
    isProcessing,
    processedCount,
    totalCount,
    ocrResults,
    error,
  };
}
