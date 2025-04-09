// src/pages/scrapbook.tsx
import { useState, useEffect } from "react";
import Image from "next/image";
import { useClientContext } from "../contexts/ClientContext";
import { fetchSavedReceipts } from "../utils/receiptApi";
import { ReceiptItem } from "../types/receipt";
import LoadingSpinner from "../components/LoadingSpinner";
import Link from "next/link";

export default function ScrapbookPage() {
  const { selectedClientId, clients } = useClientContext();
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTransferType, setSelectedTransferType] = useState<
    string | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 選択中の顧問先情報
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  // 保存済みレシートを取得
  useEffect(() => {
    const loadSavedReceipts = async () => {
      if (!selectedClientId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchSavedReceipts(selectedClientId, {
          sortBy: "date",
          sortOrder: sortOrder,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          type: selectedType || undefined,
        });

        if (response.success && response.data) {
          setReceipts(response.data);
        } else {
          setError(response.error || "データの取得に失敗しました");
        }
      } catch (err) {
        console.error("Failed to load saved receipts:", err);
        setError(
          err instanceof Error
            ? err.message
            : "データ取得中にエラーが発生しました"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedReceipts();
  }, [selectedClientId, sortOrder, startDate, endDate, selectedType]);

  // PDFを開く処理
  const handleOpenPdf = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      setError("PDFが見つかりません");
    }
  };

  // 授受区分でフィルタリングする
  const filteredByTransferType = selectedTransferType
    ? receipts.filter(
        (receipt) => receipt.transferType === selectedTransferType
      )
    : receipts;

  // 月ごとにレシートをグループ化する関数
  const groupReceiptsByMonth = (receipts: ReceiptItem[]) => {
    const groups: { [key: string]: ReceiptItem[] } = {};

    receipts.forEach((receipt) => {
      if (!receipt.date) return;

      // YYYY-MM形式の月次キーを作成
      const monthKey = receipt.date.substring(0, 7);

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }

      groups[monthKey].push(receipt);
    });

    // 日付キー順にソート
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
    });

    return sortedKeys.map((key) => ({
      monthKey: key,
      receipts: groups[key],
    }));
  };

  // レシートを月別にグループ化
  const groupedReceipts = groupReceiptsByMonth(filteredByTransferType);

  // 月名表示用のフォーマット関数
  const formatMonthDisplay = (monthKey: string) => {
    try {
      const date = new Date(monthKey + "-01");
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return monthKey; // エラーが発生した場合は元の形式で表示
    }
  };

  // 日付を「2024年1月5日」形式でフォーマット
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "日付なし";

    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr; // エラーが発生した場合は元の形式で表示
    }
  };

  // 授受区分に基づくスタイルを返す関数
  const getTransferTypeStyle = (transferType: string | undefined) => {
    switch (transferType) {
      case "受取":
        return "bg-green-100 text-green-800";
      case "渡し":
        return "bg-blue-100 text-blue-800";
      case "内部資料":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">スクラップブック</h1>

      {/* 顧問先情報表示 */}
      {selectedClient ? (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="font-medium">顧問先: {selectedClient.name}</p>
          <p className="text-sm text-gray-600">
            この顧問先のデータベースに保存された領収書を表示しています
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          <p>顧問先が選択されていません。</p>
          <Link href="/" className="text-blue-600 hover:underline">
            トップページで顧問先を選択してください
          </Link>
        </div>
      )}

      {/* フィルタと並び順 */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期間 (開始)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期間 (終了)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              種類
            </label>
            <select
              value={selectedType || ""}
              onChange={(e) => setSelectedType(e.target.value || null)}
              className="w-full p-2 border rounded"
            >
              <option value="">すべて</option>
              <option value="領収書">領収書</option>
              <option value="明細書">明細書</option>
              <option value="契約書">契約書</option>
              <option value="見積書">見積書</option>
              <option value="通帳">通帳</option>
            </select>
          </div>
        </div>

        {/* 授受区分フィルター */}
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            授受区分
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTransferType(null)}
              className={`px-3 py-1 rounded text-sm ${
                selectedTransferType === null
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setSelectedTransferType("受取")}
              className={`px-3 py-1 rounded text-sm ${
                selectedTransferType === "受取"
                  ? "bg-blue-500 text-white"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              受取
            </button>
            <button
              onClick={() => setSelectedTransferType("渡し")}
              className={`px-3 py-1 rounded text-sm ${
                selectedTransferType === "渡し"
                  ? "bg-blue-500 text-white"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
              }`}
            >
              渡し
            </button>
            <button
              onClick={() => setSelectedTransferType("内部資料")}
              className={`px-3 py-1 rounded text-sm ${
                selectedTransferType === "内部資料"
                  ? "bg-blue-500 text-white"
                  : "bg-purple-100 text-purple-800 hover:bg-purple-200"
              }`}
            >
              内部資料
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setSelectedType(null);
              setSelectedTransferType(null);
            }}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            フィルタをクリア
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm">並び順:</span>
            <button
              onClick={() => setSortOrder("desc")}
              className={`px-3 py-1 rounded ${
                sortOrder === "desc"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              新しい順
            </button>
            <button
              onClick={() => setSortOrder("asc")}
              className={`px-3 py-1 rounded ${
                sortOrder === "asc"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              古い順
            </button>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* ローディング状態 */}
      {isLoading ? (
        <div className="flex justify-center my-12">
          <LoadingSpinner size="large" text="データを読み込み中..." />
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-gray-100 p-8 text-center rounded-lg my-6">
          <p className="text-gray-600 mb-4">
            まだデータがありません。アップロードしてSupabaseに登録してください。
          </p>
          <Link
            href="/upload"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            アップロードページへ
          </Link>
        </div>
      ) : (
        // 月別グループでレシートを表示
        <div className="space-y-8">
          {groupedReceipts.map((group) => (
            <div
              key={group.monthKey}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <h2 className="bg-gray-100 p-3 font-medium text-lg">
                {formatMonthDisplay(group.monthKey)}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {group.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* 画像表示部分 */}
                    <div
                      className="h-40 bg-gray-50 cursor-pointer relative"
                      onClick={() => handleOpenPdf(receipt.pdfUrl)}
                    >
                      {receipt.thumbnailUrl ? (
                        <div className="h-full w-full flex items-center justify-center overflow-hidden relative">
                          <Image
                            src={receipt.thumbnailUrl}
                            alt={receipt.vendor || "レシート"}
                            fill
                            sizes="(max-width: 768px) 100vw, 25vw"
                            className="object-contain"
                            onError={(e) => {
                              // エラー時はプレースホルダーを表示
                              const imgElement = e.target as HTMLImageElement;
                              imgElement.onerror = null; // 無限ループ防止
                              imgElement.src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'%3E%3C/path%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-100">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                      )}
                      {/* 授受区分アイコンを左上に表示 */}
                      <div
                        className="h-40 bg-gray-50 cursor-pointer relative"
                        onClick={() => handleOpenPdf(receipt.pdfUrl)}
                      >
                        {receipt.thumbnailUrl ? (
                          <div className="h-full w-full flex items-center justify-center overflow-hidden">
                            <Image
                              src={receipt.thumbnailUrl}
                              alt={receipt.vendor || "レシート"}
                              fill
                              sizes="(max-width: 768px) 100vw, 25vw"
                              className="object-contain"
                              onError={(e) => {
                                // エラー時はプレースホルダーを表示
                                const imgElement = e.target as HTMLImageElement;
                                imgElement.onerror = null; // 無限ループ防止
                                imgElement.src =
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'%3E%3C/path%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center bg-gray-100">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-12 w-12 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                        )}

                        {/* 授受区分アイコンを左上に表示（変更なし） */}
                        <div className="absolute top-2 left-2">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${getTransferTypeStyle(
                              receipt.transferType
                            )}`}
                          >
                            {receipt.transferType || "未設定"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* レシート情報 */}
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3
                          className="font-medium truncate"
                          title={receipt.vendor}
                        >
                          {receipt.vendor || "未設定"}
                        </h3>
                        <span className="text-sm text-blue-600">
                          {receipt.amount
                            ? `¥${receipt.amount.toLocaleString()}`
                            : "¥0"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatDateDisplay(receipt.date)}</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                          {receipt.type}
                          {receipt.subType && ` (${receipt.subType})`}
                        </span>
                      </div>
                      {receipt.tag && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {receipt.tag}
                          </span>
                        </div>
                      )}
                      {receipt.memo && (
                        <p
                          className="mt-1 text-xs text-gray-600 truncate"
                          title={receipt.memo}
                        >
                          {receipt.memo}
                        </p>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPdf(receipt.pdfUrl);
                        }}
                        className="mt-2 text-xs text-blue-600 hover:underline w-full text-center"
                      >
                        PDFを開く
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 表示データ統計 */}
      {!isLoading && filteredByTransferType.length > 0 && (
        <div className="mt-6 bg-gray-100 p-3 rounded-md">
          <p className="text-sm text-gray-600">
            表示中: {filteredByTransferType.length}件
            {selectedTransferType && `（授受区分: ${selectedTransferType}）`}
            {selectedType && `（種類: ${selectedType}）`}
          </p>
        </div>
      )}
    </div>
  );
}
