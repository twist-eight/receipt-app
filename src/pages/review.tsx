import { useEffect, useState } from "react";
import Image from "next/image";
import { ReceiptItem } from "../types/receipt";
import { useReloadWarning } from "../hooks/useReloadWarning";

export default function ReviewPage() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isConfirmAllDialogOpen, setIsConfirmAllDialogOpen] =
    useState<boolean>(false);

  // リロード警告を有効化（データがある場合のみ）
  useReloadWarning(
    items.length > 0,
    "ページをリロードすると画像とPDFが表示できなくなる可能性があります。続けますか？"
  );

  useEffect(() => {
    loadDataFromStorage();
  }, []);

  const loadDataFromStorage = () => {
    const raw = sessionStorage.getItem("ocrResults");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }
  };

  const handleChange = <K extends keyof ReceiptItem>(
    index: number,
    field: K,
    value: ReceiptItem[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      sessionStorage.setItem("ocrResults", JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenPdf = (pdfUrl: string) => {
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
      console.warn("無効なPDF URLです", pdfUrl);
    }
  };

  // レシートの個別削除（確認なし）
  const deleteItem = (index: number) => {
    const item = items[index];

    // BlobURLを解放
    try {
      if (item.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.imageUrl);
      }
      if (item.pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.pdfUrl);
      }
    } catch (e) {
      console.error("Failed to revoke URLs:", e);
    }

    // 状態更新
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);

    // セッションストレージ更新
    sessionStorage.setItem("ocrResults", JSON.stringify(updatedItems));
  };

  // 全データをクリアする関数
  const clearAllData = () => {
    // BlobURLを解放
    items.forEach((item) => {
      if (item.imageUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(item.imageUrl);
        } catch (e) {
          console.error("Failed to revoke image URL:", e);
        }
      }
      if (item.pdfUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(item.pdfUrl);
        } catch (e) {
          console.error("Failed to revoke PDF URL:", e);
        }
      }
    });

    // セッションストレージをクリア
    sessionStorage.removeItem("ocrResults");

    // 状態をリセット
    setItems([]);
    setIsConfirmAllDialogOpen(false);
  };

  const loadTestData = () => {
    const testData: ReceiptItem[] = [
      {
        id: "test001",
        imageUrl: "/sample.jpg",
        pdfUrl: "/sample.pdf",
        date: "2025-04-01",
        vendor: "テスト商店",
        amount: 1234,
        type: "領収書",
        memo: "テスト用メモ",
        tag: "交際費",
        status: "完了",
      },
    ];
    sessionStorage.setItem("ocrResults", JSON.stringify(testData));
    setItems(testData);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">OCR結果の確認と編集</h1>

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2 mb-6">
        {items.length > 0 && (
          <button
            onClick={() => setIsConfirmAllDialogOpen(true)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            全データをクリア
          </button>
        )}
      </div>

      {/* 全削除確認ダイアログ */}
      {isConfirmAllDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">全データを削除しますか？</h3>
            <p className="mb-6 text-gray-700">
              すべてのレシートデータが完全に削除されます。この操作は元に戻せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmAllDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={clearAllData}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="mb-6">
          <p className="mb-2">
            データがありません。テストデータを読み込みますか？
          </p>
          <button
            onClick={loadTestData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            テストモードを開始
          </button>
        </div>
      )}

      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={item.id} className="border p-4 rounded shadow-md relative">
            {/* 削除ボタン - 確認なし */}
            <button
              onClick={() => deleteItem(index)}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
              aria-label="削除"
              title="このレシートを削除"
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

            <div className="flex gap-4 mb-2 items-center">
              {item.imageUrl && (
                <div className="relative w-32 h-40">
                  <Image
                    src={item.imageUrl}
                    alt="preview"
                    fill
                    className="object-contain rounded"
                  />
                </div>
              )}
              {item.pdfUrl && (
                <button
                  onClick={() => handleOpenPdf(item.pdfUrl)}
                  className="text-blue-600 underline text-sm"
                >
                  PDFを開く
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input
                type="date"
                value={item.date}
                onChange={(e) => handleChange(index, "date", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="text"
                value={item.vendor}
                placeholder="取引先"
                onChange={(e) => handleChange(index, "vendor", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="number"
                value={item.amount}
                placeholder="金額"
                onChange={(e) =>
                  handleChange(index, "amount", Number(e.target.value))
                }
                className="border p-2 rounded"
              />
              <select
                value={item.type}
                onChange={(e) => handleChange(index, "type", e.target.value)}
                className="border p-2 rounded"
              >
                <option>領収書</option>
                <option>明細書</option>
                <option>契約書</option>
                <option>見積書</option>
                <option>通帳</option>
              </select>
              <input
                type="text"
                value={item.memo}
                placeholder="メモ"
                onChange={(e) => handleChange(index, "memo", e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="text"
                value={item.tag}
                placeholder="タグ（交際費など）"
                onChange={(e) => handleChange(index, "tag", e.target.value)}
                className="border p-2 rounded"
              />
              <select
                value={item.status}
                onChange={(e) => handleChange(index, "status", e.target.value)}
                className="border p-2 rounded"
              >
                <option>完了</option>
                <option>要質問</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
