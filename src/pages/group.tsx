// src/pages/group.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../contexts/ReceiptContext";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { v4 as uuidv4 } from "uuid";
import { ReceiptItem } from "../types/receipt";
import ImageCarousel from "../components/ImageCarousel";
import ConfirmDialog from "../components/ConfirmDialog";

export default function GroupPage() {
  const router = useRouter();
  const { receipts, setReceipts, removeReceipt } = useReceiptContext();
  const { mergePdfs } = usePdfProcessing();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // アイテムの選択/選択解除
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // グループ化処理
  const handleCreateGroup = async () => {
    if (selectedIds.length < 2) {
      setError("グループ化するには2つ以上のアイテムを選択してください");
      return;
    }

    try {
      const selectedItems = receipts.filter((item) =>
        selectedIds.includes(item.id)
      );
      const pdfUrls = selectedItems.map((item) => item.pdfUrl);
      const { mergedPdfUrl, mergedImageUrls } = await mergePdfs(pdfUrls);

      // 新しいグループアイテムを作成
      const newGroupItem: ReceiptItem = {
        id: uuidv4(),
        imageUrls: mergedImageUrls,
        pdfUrl: mergedPdfUrl,
        date: selectedItems[0].date,
        vendor: groupName || selectedItems[0].vendor,
        amount: selectedItems.reduce(
          (sum, item) => sum + (item.amount || 0),
          0
        ),
        type: selectedItems[0].type,
        memo: `グループ: ${
          groupName ||
          selectedItems.map((item) => item.vendor || "未設定").join(", ")
        }`,
        tag: selectedItems[0].tag,
        status: selectedItems[0].status,
      };

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
      setGroupName("");
      setIsConfirmDialogOpen(false);
    } catch (err) {
      console.error("グループ化に失敗しました:", err);
      setError("PDFのグループ化に失敗しました");
    }
  };

  const handleNextStep = () => {
    router.push("/ocr");
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
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

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2 mb-6">
        {selectedIds.length >= 2 && (
          <button
            onClick={() => setIsConfirmDialogOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            選択したアイテムをグループ化 ({selectedIds.length})
          </button>
        )}

        <button
          onClick={handleNextStep}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-auto"
        >
          次へ：OCR実行
        </button>
      </div>

      {/* グループ化確認ダイアログ */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          title="アイテムをグループ化"
          message={`選択した ${selectedIds.length} 個のアイテムをグループ化します。グループ名を入力してください（任意）。`}
          confirmLabel="グループ化する"
          cancelLabel="キャンセル"
          onConfirm={handleCreateGroup}
          onCancel={() => setIsConfirmDialogOpen(false)}
          isDestructive={false}
          extraContent={
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                グループ名
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="例：○○社契約書"
                className="w-full p-2 border rounded"
              />
            </div>
          }
        />
      )}

      {/* アイテム一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receipts.map((item) => (
          <div
            key={item.id}
            className={`border p-4 rounded cursor-pointer transition-all ${
              selectedIds.includes(item.id)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-300"
            }`}
            onClick={() => toggleSelection(item.id)}
          >
            <div className="flex justify-between mb-2">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelection(item.id)}
                className="h-5 w-5"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-gray-500">
                ID: {item.id.substring(0, 8)}...
              </span>
            </div>

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
