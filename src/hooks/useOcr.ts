import { useState, useCallback } from "react";
import { OCRResult, OCROptions, ReceiptItem } from "../types";
import { useLoading } from "../contexts/LoadingContext";
import { useToast } from "../components/ToastContext";
import { useErrorHandler } from "../utils/errorHandling";
import { processImageWithOCR } from "../utils/ocrService";

// OCRサービスのモックインポート（実際の実装は適宜置き換え）
/*
const processImageWithOCR = async (
  imageUrl: string,
  options: OCROptions = {}
): Promise<OCRResult> => {
  // Use options explicitly to avoid the ESLint warning
  const language = options.language || "auto";
  const documentType = options.documentType || "default";

  // ここでは簡易的なモック実装
  // 実際の実装では、実際のOCR APIとの通信を行う
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 処理を模擬

  console.log(
    `Processing image with language: ${language}, documentType: ${documentType}`
  );

  return {
    text: "OCR処理結果のテキスト例",
    vendor: "サンプル株式会社",
    date: "2024-04-01",
    amount: 12345,
    confidence: 0.9,
    items: [
      { description: "商品A", price: 9800 },
      { description: "商品B", price: 2545 },
    ],
  };
};
*/
interface UseOcrReturn {
  runOcr: (
    receipt: ReceiptItem,
    options?: OCROptions
  ) => Promise<OCRResult | null>;
  processMultipleReceipts: (
    receipts: ReceiptItem[],
    options?: OCROptions
  ) => Promise<void>;
  applyOcrResults: (
    receiptId: string,
    results: OCRResult
  ) => Partial<ReceiptItem>;
  generateThumbnail: (imageUrl: string) => Promise<string>;
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  ocrResults: Record<string, OCRResult>;
  error: string | null;
  clearError: () => void;
}

export function useOcr(): UseOcrReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [ocrResults, setOcrResults] = useState<Record<string, OCRResult>>({});
  const [error, setError] = useState<string | null>(null);

  const { startLoading, stopLoading, updateProgress, updateLoadingMessage } =
    useLoading();
  const { addToast } = useToast();
  const { handleError } = useErrorHandler();

  // エラークリア関数
  const clearError = useCallback(() => setError(null), []);

  // 単一のレシートに対してOCR処理を実行
  const runOcr = async (
    receipt: ReceiptItem,
    options: OCROptions = {}
  ): Promise<OCRResult | null> => {
    if (!receipt.imageUrls || receipt.imageUrls.length === 0) {
      setError("OCR処理に必要な画像がありません");
      return null;
    }

    startLoading(`"${receipt.vendor || "レシート"}"のOCR処理中...`);
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

      // サムネイル生成と保存
      if (!receipt.thumbnailUrl) {
        const thumbnailUrl = await generateThumbnail(imageUrl);
        if (thumbnailUrl) {
          sessionStorage.setItem(`thumbnail_${receipt.id}`, thumbnailUrl);
        }
      }

      return results;
    } catch (err) {
      handleError(err, {
        fallbackMessage: "OCR処理に失敗しました",
        showToast: true,
      });
      return null;
    } finally {
      setIsProcessing(false);
      stopLoading();
    }
  };

  // サムネイル生成関数 - 最適化済み
  const generateThumbnail = async (imageUrl: string): Promise<string> => {
    try {
      if (!imageUrl) {
        throw new Error("画像URLが指定されていません");
      }

      // 画像をロード
      const img = new Image();
      img.crossOrigin = "anonymous"; // CORS対応
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
      const maxSize = 200;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // 背景を白で塗りつぶし（透明画像対応）
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 画像を描画
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // DataURLとして返す
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.error("サムネイル生成エラー:", err);
      handleError(err, {
        fallbackMessage: "サムネイルの生成に失敗しました",
        silent: true,
      });
      return "";
    }
  };

  // 複数の受領書を処理する関数 - パフォーマンス最適化済み
  const processMultipleReceipts = async (
    receipts: ReceiptItem[],
    options: OCROptions = {}
  ) => {
    if (receipts.length === 0) {
      setError("処理する受領書がありません");
      return;
    }

    startLoading(`OCR処理を開始: 0/${receipts.length}`);
    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);
    setTotalCount(receipts.length);

    const newResults: Record<string, OCRResult> = {};
    let hasError = false;

    try {
      // バッチサイズを定義（同時に多すぎるとAPIの制限に引っかかる可能性あり）
      const batchSize = 3;

      // バッチ処理ユーティリティ関数
      const processBatch = async (batch: ReceiptItem[], startIndex: number) => {
        const batchResults = await Promise.all(
          batch.map(async (receipt, index) => {
            try {
              if (!receipt.imageUrls || receipt.imageUrls.length === 0) {
                console.warn(`Receipt ${receipt.id} has no images, skipping.`);
                return { id: receipt.id, result: null, success: false };
              }

              const processIndex = startIndex + index;
              updateLoadingMessage(
                `OCR処理中: ${processIndex + 1}/${receipts.length}`
              );

              const imageUrl = receipt.imageUrls[0];
              // OCR処理を実行
              const result = await processImageWithOCR(imageUrl, {
                documentType: receipt.type,
                ...options,
              });

              // サムネイルを生成して保存
              if (!receipt.thumbnailUrl) {
                const thumbnailUrl = await generateThumbnail(imageUrl);
                if (thumbnailUrl) {
                  // サムネイルを保存
                  sessionStorage.setItem(
                    `thumbnail_${receipt.id}`,
                    thumbnailUrl
                  );
                }
              }

              return { id: receipt.id, result, success: true };
            } catch (err) {
              console.error(
                `OCR processing failed for receipt ${receipt.id}:`,
                err
              );
              return { id: receipt.id, result: null, success: false };
            }
          })
        );

        return batchResults;
      };

      // バッチに分けて処理
      for (let i = 0; i < receipts.length; i += batchSize) {
        const batch = receipts.slice(i, i + batchSize);
        const batchResults = await processBatch(batch, i);

        // 結果を処理
        batchResults.forEach(({ id, result, success }) => {
          if (success && result) {
            newResults[id] = result;
          } else {
            hasError = true;
          }
        });

        // 進捗を更新
        const processedSoFar = Math.min(i + batchSize, receipts.length);
        setProcessedCount(processedSoFar);
        updateProgress(processedSoFar, receipts.length);
      }

      // 全ての結果を保存
      setOcrResults((prev) => ({
        ...prev,
        ...newResults,
      }));

      // エラーがあれば通知
      if (hasError) {
        setError(
          "一部の処理で問題が発生しました。詳細はコンソールを確認してください。"
        );
        addToast("一部のOCR処理が失敗しました", "warning");
      } else {
        addToast(`${receipts.length}件のOCR処理が完了しました`, "success");
      }
    } catch (err) {
      handleError(err, {
        fallbackMessage: "OCR処理に失敗しました",
        showToast: true,
      });
    } finally {
      setIsProcessing(false);
      stopLoading();
    }
  };

  // OCR結果から更新データを作成
  const applyOcrResults = useCallback(
    (receiptId: string, results: OCRResult): Partial<ReceiptItem> => {
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
        // メモにOCRのテキスト概要を入れる
        const textSummary =
          results.text.length > 200
            ? `${results.text.substring(0, 200)}...`
            : results.text;
        updates.memo = `OCR結果: ${textSummary}`;
      }

      return updates;
    },
    []
  );

  return {
    runOcr,
    processMultipleReceipts,
    applyOcrResults,
    generateThumbnail,
    isProcessing,
    processedCount,
    totalCount,
    ocrResults,
    error,
    clearError,
  };
}
