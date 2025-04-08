// src/pages/review.tsx
import { useState } from "react";
import { useReceiptContext } from "../contexts/ReceiptContext";
import { useReloadWarning } from "../hooks/useReloadWarning";
import ReceiptCard from "../components/ReceiptCard";
import ConfirmDialog from "../components/ConfirmDialog";
import GroupDialog from "../components/GroupDialog";
import { ReceiptItem } from "../types/receipt";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

export default function ReviewPage() {
  const {
    receipts,
    // setReceipts を削除またはリネーム
    updateReceipt,
    removeReceipt,
    clearReceipts,
    addReceipt,
  } = useReceiptContext();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState<boolean>(false);
  const { mergePdfs } = usePdfProcessing();

  // リロード警告を有効化（データがある場合のみ）
  useReloadWarning(
    receipts.length > 0,
    "ページをリロードすると画像とPDFが表示できなくなる可能性があります。続けますか？"
  );

  const handleUpdateReceipt = <K extends keyof ReceiptItem>(
    id: string,
    field: K,
    value: ReceiptItem[K]
  ) => {
    updateReceipt(id, { [field]: value });
  };

  const handleOpenPdf = (pdfUrl: string) => {
    try {
      if (pdfUrl.startsWith("blob:") || pdfUrl.startsWith("http")) {
        window.open(pdfUrl, "_blank");
      } else if (pdfUrl.startsWith("data:application/pdf")) {
        const byteCharacters = atob(pdfUrl.split(",")[1]);
        const byteNumbers = new Array(byteCharacters.length)
          .fill(0)
          .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        throw new Error("無効なPDF URLです");
      }
    } catch (err) {
      console.error("PDFを開く際にエラーが発生しました:", err);
      setError(
        `PDFを開けませんでした: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const handleDeleteItem = (id: string) => {
    const receiptToDelete = receipts.find((receipt) => receipt.id === id);
    if (!receiptToDelete) return;

    // BlobURLを解放
    try {
      if (receiptToDelete.imageUrls) {
        receiptToDelete.imageUrls.forEach((imageUrl) => {
          if (imageUrl.startsWith("blob:")) {
            URL.revokeObjectURL(imageUrl);
          }
        });
      }
      if (receiptToDelete.pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(receiptToDelete.pdfUrl);
      }
    } catch (e) {
      console.error("Failed to revoke URLs:", e);
    }

    // 選択リストからも削除
    setSelectedItemIds((prev) =>
      prev.filter((selectedId) => selectedId !== id)
    );

    // コンテキスト経由で削除
    removeReceipt(id);
  };

  const handleClearAllData = () => {
    // BlobURLを解放
    receipts.forEach((receipt) => {
      if (receipt.imageUrls) {
        receipt.imageUrls.forEach((imageUrl) => {
          if (imageUrl.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(imageUrl);
            } catch (e) {
              console.error("Failed to revoke image URL:", e);
            }
          }
        });
      }
      if (receipt.pdfUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(receipt.pdfUrl);
        } catch (e) {
          console.error("Failed to revoke PDF URL:", e);
        }
      }
    });

    // コンテキスト経由で全削除
    clearReceipts();
    setIsConfirmDialogOpen(false);
    // 選択状態もクリア
    setSelectedItemIds([]);
  };

  const toggleItemSelection = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedItemIds((prev) => [...prev, id]);
    } else {
      setSelectedItemIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleGroupConfirm = async () => {
    if (selectedItemIds.length < 2) {
      setError("グループ化するには2つ以上のアイテムを選択してください");
      return;
    }

    try {
      // 選択したアイテムを取得
      const selectedItems = receipts.filter((item) =>
        selectedItemIds.includes(item.id)
      );

      // PDFをマージ
      const pdfUrls = selectedItems.map((item) => item.pdfUrl);
      const { mergedPdfUrl, mergedImageUrls } = await mergePdfs(pdfUrls);

      // 新しいグループアイテムを作成 (グループ名なしで)
      const newGroupItem: ReceiptItem = {
        id: uuidv4(),
        imageUrls: mergedImageUrls, // 全てのページの画像URLを配列として保存
        pdfUrl: mergedPdfUrl,
        date: selectedItems[0].date,
        updatedAt: new Date().toISOString().split("T")[0], // 今日の日付を追加
        vendor: selectedItems[0].vendor,
        amount: selectedItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0
        ),
        type: selectedItems[0].type,
        memo: `グループ: ${selectedItems
          .map((item) => item.vendor || "Unnamed")
          .join(", ")}`,
        tag: selectedItems[0].tag,
        status: selectedItems[0].status,
      };

      // 元のアイテムを削除
      selectedItemIds.forEach((id) => {
        const item = receipts.find((r) => r.id === id);
        if (item) {
          // BlobURLを解放
          if (item.imageUrls) {
            item.imageUrls.forEach((url) => {
              if (url.startsWith("blob:")) {
                try {
                  URL.revokeObjectURL(url);
                } catch {}
              }
            });
          }
          if (item.pdfUrl.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(item.pdfUrl);
            } catch {}
          }
          removeReceipt(id);
        }
      });

      // 新しいグループアイテムを追加
      addReceipt(newGroupItem);

      // 選択をリセット
      setSelectedItemIds([]);
      setIsGroupDialogOpen(false);
    } catch (error) {
      console.error("PDFのグループ化に失敗しました:", error);
      setError("PDFのグループ化に失敗しました");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">OCR結果の確認と編集</h1>

        <div className="flex gap-2">
          {receipts.length > 0 && (
            <>
              {selectedItemIds.length >= 2 && (
                <button
                  onClick={() => setIsGroupDialogOpen(true)}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center text-sm"
                  aria-label="選択したアイテムをグループ化"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  {selectedItemIds.length}件をグループ化
                </button>
              )}

              <button
                onClick={() => setIsConfirmDialogOpen(true)}
                className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 flex items-center text-sm"
                aria-label="全データをクリア"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                全データをクリア
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-900"
            aria-label="エラーメッセージを閉じる"
          >
            ×
          </button>
        </div>
      )}

      {/* 選択情報と制御エリア */}
      {receipts.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg mb-4 flex justify-between items-center">
          <div>
            <span className="text-sm font-medium">
              {selectedItemIds.length} / {receipts.length} アイテムを選択中
            </span>
          </div>
          <div>
            <button
              onClick={() =>
                setSelectedItemIds(
                  selectedItemIds.length === receipts.length
                    ? []
                    : receipts.map((r) => r.id)
                )
              }
              className="text-sm text-blue-600 hover:underline"
            >
              {selectedItemIds.length === receipts.length
                ? "全て選択解除"
                : "全て選択"}
            </button>
          </div>
        </div>
      )}

      {receipts.length === 0 && (
        <div className="mb-6 p-8 bg-gray-100 rounded-lg text-center">
          <p className="mb-2">
            データがありません。アップロードページからドキュメントを追加してください。
          </p>
          <Link
            href="/upload"
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
          >
            アップロードページへ
          </Link>
        </div>
      )}

      {/* レシートカードのグリッドレイアウトを改善 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {receipts.map((receipt) => (
          <div key={receipt.id} className="relative">
            <button
              onClick={() => handleDeleteItem(receipt.id)}
              className="absolute top-2 right-2 z-10 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
              aria-label={`${receipt.vendor || "レシート"}を削除`}
              title="このレシートを削除"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <ReceiptCard
              receipt={receipt}
              onChange={(field, value) =>
                handleUpdateReceipt(receipt.id, field, value)
              }
              onOpenPdf={handleOpenPdf}
              isSelected={selectedItemIds.includes(receipt.id)}
              onSelectChange={(isSelected) =>
                toggleItemSelection(receipt.id, isSelected)
              }
              showCheckbox={true}
              onDelete={() => handleDeleteItem(receipt.id)}
            />
          </div>
        ))}
      </div>

      {/* 確認ダイアログ */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          title="全データを削除しますか？"
          message="すべてのレシートデータが完全に削除されます。この操作は元に戻せません。"
          confirmLabel="削除する"
          cancelLabel="キャンセル"
          onConfirm={handleClearAllData}
          onCancel={() => setIsConfirmDialogOpen(false)}
          isDestructive={true}
        />
      )}

      {/* グループ化ダイアログ */}
      {isGroupDialogOpen && (
        <GroupDialog
          selectedCount={selectedItemIds.length}
          onConfirm={handleGroupConfirm}
          onCancel={() => setIsGroupDialogOpen(false)}
        />
      )}
    </div>
  );
}
