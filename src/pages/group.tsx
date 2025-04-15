// src/pages/group.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../features/receipts/contexts/ReceiptContext";
import { usePdfProcessing } from "../features/pdf/hooks/usePdfProcessing";
import { v4 as uuidv4 } from "uuid";
import { ReceiptItem } from "../types/receipt";
import ImageCarousel from "../components/ImageCarousel";
import ConfirmDialog from "../components/ConfirmDialog"; // 追加：確認ダイアログのインポート

export default function GroupPage() {
  const router = useRouter();
  const { receipts, setReceipts, removeReceipt } = useReceiptContext();
  const { mergePdfs } = usePdfProcessing();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // 追加：削除確認用の状態
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // カードサイズのオプションと状態
  const sizeOptions = [
    { value: "small", label: "小" },
    { value: "medium", label: "中", default: true },
    { value: "large", label: "大" },
  ];
  const [cardSize, setCardSize] = useState("medium");

  // アイテムの選択/選択解除
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // 追加：削除ボタンクリック時の処理
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // カードの選択イベントが発火しないようにする
    setItemToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // 追加：削除処理の実行
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    const item = receipts.find((r) => r.id === itemToDelete);
    if (item) {
      // Blob URLの解放
      if (item.imageUrls) {
        item.imageUrls.forEach((url) => {
          if (url.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error("Failed to revoke image URL:", e);
            }
          }
        });
      }
      if (item.pdfUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(item.pdfUrl);
        } catch (e) {
          console.error("Failed to revoke PDF URL:", e);
        }
      }

      // 選択リストからも削除
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete));

      // アイテムを削除
      removeReceipt(itemToDelete);
    }

    // ダイアログを閉じてリセット
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // グループ化処理
  const handleCreateGroup = async () => {
    if (selectedIds.length < 2) {
      setError("グループ化するには2つ以上のアイテムを選択してください");
      return;
    }

    setIsProcessing(true);

    try {
      const selectedItems = receipts.filter((item) =>
        selectedIds.includes(item.id)
      );
      const pdfUrls = selectedItems.map((item) => item.pdfUrl);

      // 修正: thumbnailDataUrlを受け取るように変更
      const { mergedPdfUrl, mergedImageUrls, thumbnailDataUrl } =
        await mergePdfs(pdfUrls);

      // 新しいグループアイテムを作成
      const newGroupItem: ReceiptItem = {
        id: uuidv4(),
        imageUrls: mergedImageUrls,
        pdfUrl: mergedPdfUrl,
        date: selectedItems[0].date, // 元の日付を保持
        updatedAt: new Date().toISOString().split("T")[0], // 今日の日付を追加
        vendor: selectedItems[0].vendor,
        amount: selectedItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0
        ),
        type: selectedItems[0].type,
        memo: `グループ化されたドキュメント`,
        tag: selectedItems[0].tag,
        status: selectedItems[0].status,
      };

      // 追加: サムネイルをセッションストレージに保存
      if (thumbnailDataUrl) {
        sessionStorage.setItem(
          `thumbnail_${newGroupItem.id}`,
          thumbnailDataUrl
        );
        console.log(
          `グループアイテム ${newGroupItem.id} のサムネイルを保存しました`
        );
      }

      // 元のアイテムを削除
      selectedIds.forEach((id) => {
        const item = receipts.find((r) => r.id === id);
        if (item) {
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

      // グループアイテムを追加
      const updatedReceipts = [
        ...receipts.filter((r) => !selectedIds.includes(r.id)),
        newGroupItem,
      ];
      setReceipts(updatedReceipts);

      // 選択解除
      setSelectedIds([]);
    } catch (err) {
      console.error("グループ化に失敗しました:", err);
      setError("PDFのグループ化に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextStep = () => {
    router.push("/ocr");
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      <h1 className="text-xl font-bold mb-4">ドキュメントのグループ化</h1>

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

      {/* カードサイズ選択 */}
      <div className="mb-4 flex items-center">
        <span className="mr-2">カードサイズ:</span>
        <div className="flex border rounded overflow-hidden">
          {sizeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setCardSize(option.value)}
              className={`px-3 py-1 text-sm ${
                cardSize === option.value
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 削除確認ダイアログ（追加） */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          title="ドキュメントの削除"
          message="このドキュメントを削除してもよろしいですか？この操作は元に戻せません。"
          confirmLabel="削除する"
          cancelLabel="キャンセル"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
          }}
          isDestructive={true}
        />
      )}

      {/* 常に表示される固定ボタンエリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {selectedIds.length >= 2 ? (
            <button
              onClick={handleCreateGroup}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  処理中...
                </>
              ) : (
                `選択したアイテムをグループ化 (${selectedIds.length})`
              )}
            </button>
          ) : (
            <span className="text-gray-500">
              グループ化するアイテムを選択してください
            </span>
          )}

          <button
            onClick={handleNextStep}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            次へ：OCR実行
          </button>
        </div>
      </div>

      {/* アイテム一覧 - カードサイズに応じてグリッドを調整 */}

      <div
        className={`grid ${
          cardSize === "small"
            ? "grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : cardSize === "medium"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 lg:grid-cols-2"
        } gap-4`}
      >
        {receipts.map((item) => (
          <div
            key={item.id}
            className={`border p-4 rounded cursor-pointer transition-all relative ${
              selectedIds.includes(item.id)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-300"
            }`}
            onClick={() => toggleSelection(item.id)}
          >
            {/* 削除ボタン */}
            <button
              onClick={(e) => handleDeleteClick(item.id, e)}
              className="absolute top-2 right-2 z-10 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
              aria-label="削除"
              title="このドキュメントを削除"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* チェックボックスのみ表示 - IDは削除 */}
            <div className="mb-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelection(item.id)}
                className="h-5 w-5"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {item.imageUrls && item.imageUrls.length > 0 && (
              <div className="mb-2">
                <ImageCarousel
                  images={item.imageUrls}
                  className={`${
                    cardSize === "small"
                      ? "h-24"
                      : cardSize === "medium"
                      ? "h-80"
                      : "h-120"
                  }`}
                />
                {item.imageUrls.length > 1 && (
                  <p className="text-xs text-center mt-1">
                    {item.imageUrls.length}ページ
                  </p>
                )}
              </div>
            )}

            {item.vendor && (
              <p
                className={`font-medium truncate ${
                  cardSize === "small"
                    ? "text-xs"
                    : cardSize === "medium"
                    ? "text-sm"
                    : "text-base"
                }`}
              >
                {item.vendor}
              </p>
            )}

            {/* 日付の表示を削除し、IDを左下に配置 */}
            <p className="text-xs text-gray-500 mt-2">
              ID: {item.id.substring(0, 8)}...
            </p>
          </div>
        ))}
      </div>

      {receipts.length === 0 && (
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p>アップロードされたドキュメントがありません。</p>
          <button
            onClick={() => router.push("/upload")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            アップロードページへ
          </button>
        </div>
      )}
    </div>
  );
}
