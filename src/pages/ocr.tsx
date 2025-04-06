// src/pages/ocr.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../contexts/ReceiptContext";
import ImageCarousel from "../components/ImageCarousel";
import ConfirmDialog from "../components/ConfirmDialog";

export default function OcrPage() {
  const router = useRouter();
  const { receipts } = useReceiptContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // OCR実行の処理（モック - 実際のOCR処理はここに実装）
  const runOcr = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setError(null);

    try {
      // ここに実際のOCR処理を実装
      // 現在はモックとして、単純にカウントアップするだけ
      for (let i = 0; i < receipts.length; i++) {
        // OCR処理のシミュレーション
        await new Promise((resolve) => setTimeout(resolve, 500));
        setProcessedCount(i + 1);
      }

      // 処理完了後、レビューページへ
      router.push("/review");
    } catch (err) {
      console.error("OCR処理中にエラーが発生:", err);
      setError("OCR処理中にエラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">OCR処理</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setIsConfirmDialogOpen(true)}
          disabled={isProcessing || receipts.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <span className="inline-block mr-2">処理中...</span>
              <span>
                {processedCount}/{receipts.length}
              </span>
            </>
          ) : (
            "OCR処理を実行"
          )}
        </button>
      </div>

      {/* 確認ダイアログ */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          title="OCR処理を開始"
          message={`${receipts.length}個のドキュメントに対してOCR処理を実行します。処理には時間がかかる場合があります。`}
          confirmLabel="開始"
          cancelLabel="キャンセル"
          onConfirm={() => {
            setIsConfirmDialogOpen(false);
            runOcr();
          }}
          onCancel={() => setIsConfirmDialogOpen(false)}
        />
      )}

      {/* 処理対象ドキュメント一覧 */}
      <h2 className="text-lg font-medium mb-3">
        処理対象ドキュメント ({receipts.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receipts.map((item) => (
          <div key={item.id} className="border p-4 rounded bg-white">
            {item.imageUrls && item.imageUrls.length > 0 && (
              <div className="mb-2">
                <ImageCarousel images={item.imageUrls} />
                {item.imageUrls.length > 1 && (
                  <p className="text-xs text-center mt-1">
                    {item.imageUrls.length}ページ
                  </p>
                )}
              </div>
            )}

            <p className="text-sm font-medium truncate">
              {item.vendor || "未設定の取引先"}
            </p>
            <p className="text-xs text-gray-500">{item.date || "日付なし"}</p>
          </div>
        ))}
      </div>

      {receipts.length === 0 && (
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p>処理対象のドキュメントがありません。</p>
          <button
            onClick={() => router.push("/group")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            グループ化ページへ
          </button>
        </div>
      )}
    </div>
  );
}
