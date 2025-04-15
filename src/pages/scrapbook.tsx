// src/pages/scrapbook.tsx
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useClientContext } from "../features/clients/contexts/ClientContext";
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
  // グリッドサイズ設定の状態
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">(
    "medium"
  );
  // 画像読み込み状態の管理
  const [loadingImages, setLoadingImages] = useState<{
    [key: string]: boolean;
  }>({});
  // 検索用の状態
  const [searchQuery, setSearchQuery] = useState<string>("");

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

          // 画像の読み込み状態を初期化
          const initialLoadingState: { [key: string]: boolean } = {};
          response.data.forEach((receipt) => {
            initialLoadingState[receipt.id] = true;
          });
          setLoadingImages(initialLoadingState);
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

  // PDFを開く処理 - 修正：直接新しいタブで開く
  const handleOpenPdf = (pdfUrl: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      setError("PDFが見つかりません");
    }
  };

  // 画像読み込み完了時の処理
  const handleImageLoaded = (id: string) => {
    setLoadingImages((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // 画像読み込みエラー時の処理
  const handleImageError = (id: string) => {
    setLoadingImages((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  // 授受区分でフィルタリングする
  const filteredReceipts = useMemo(() => {
    let filtered = receipts;

    // 授受区分フィルター
    if (selectedTransferType) {
      filtered = filtered.filter(
        (receipt) => receipt.transferType === selectedTransferType
      );
    }

    // 検索クエリフィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (receipt) =>
          (receipt.vendor && receipt.vendor.toLowerCase().includes(query)) ||
          (receipt.memo && receipt.memo.toLowerCase().includes(query)) ||
          (receipt.tag && receipt.tag.toLowerCase().includes(query)) ||
          (receipt.type && receipt.type.toLowerCase().includes(query)) ||
          (receipt.subType && receipt.subType.toLowerCase().includes(query)) ||
          (receipt.amount && receipt.amount.toString().includes(query)) ||
          (receipt.date && receipt.date.includes(query))
      );
    }

    return filtered;
  }, [receipts, selectedTransferType, searchQuery]);

  // 月ごとにレシートをグループ化する関数（グループ内で日付順に並べる）
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

    // 月ごとのグループをソート
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b);
    });

    // 各グループ内で日付順にソート
    return sortedKeys.map((key) => ({
      monthKey: key,
      receipts: groups[key].sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return sortOrder === "desc"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      }),
    }));
  };

  // レシートを月別にグループ化
  const groupedReceipts = groupReceiptsByMonth(filteredReceipts);

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

  // カードサイズに応じたグリッドクラスを返す関数
  const getGridSizeClass = () => {
    switch (gridSize) {
      case "small":
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
      case "medium":
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case "large":
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3";
      default:
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

  // カードサイズに応じた高さクラスを返す関数
  const getCardHeightClass = () => {
    switch (gridSize) {
      case "small":
        return "h-36";
      case "medium":
        return "h-48";
      case "large":
        return "h-64";
      default:
        return "h-48";
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

      {/* 検索フォーム */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="取引先、メモ、タグなどで検索..."
            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          {searchQuery && (
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setSearchQuery("")}
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* フィルターと表示オプション */}
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
              className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              種類
            </label>
            <select
              value={selectedType || ""}
              onChange={(e) => setSelectedType(e.target.value || null)}
              className="w-full p-2 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-3">
          {/* フィルタリセットボタン */}
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setSelectedType(null);
              setSelectedTransferType(null);
              setSearchQuery("");
            }}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            フィルタをクリア
          </button>

          <div className="flex flex-wrap items-center gap-3">
            {/* 表示サイズ切替 */}
            <div className="flex items-center">
              <span className="text-sm mr-2">表示サイズ:</span>
              <div className="flex border rounded overflow-hidden">
                <button
                  onClick={() => setGridSize("small")}
                  className={`px-2 py-1 text-xs ${
                    gridSize === "small"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  小
                </button>
                <button
                  onClick={() => setGridSize("medium")}
                  className={`px-2 py-1 text-xs ${
                    gridSize === "medium"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  中
                </button>
                <button
                  onClick={() => setGridSize("large")}
                  className={`px-2 py-1 text-xs ${
                    gridSize === "large"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  大
                </button>
              </div>
            </div>

            {/* 並び順切替 */}
            <div className="flex items-center">
              <span className="text-sm mr-2">並び順:</span>
              <div className="flex border rounded overflow-hidden">
                <button
                  onClick={() => setSortOrder("desc")}
                  className={`px-3 py-1 ${
                    sortOrder === "desc"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  新しい順
                </button>
                <button
                  onClick={() => setSortOrder("asc")}
                  className={`px-3 py-1 ${
                    sortOrder === "asc"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  古い順
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">
            ×
          </button>
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
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            アップロードページへ
          </Link>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="bg-yellow-50 p-8 text-center rounded-lg my-6">
          <p className="text-yellow-700 mb-4">
            検索条件に一致するデータが見つかりませんでした。
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedType(null);
              setSelectedTransferType(null);
            }}
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            検索条件をクリア
          </button>
        </div>
      ) : (
        // 月別グループでレシートを表示
        <div className="space-y-8">
          {groupedReceipts.map((group) => (
            <div
              key={group.monthKey}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <h2 className="bg-gray-50 p-3 font-medium text-lg border-b">
                {formatMonthDisplay(group.monthKey)}
                <span className="text-sm text-gray-500 ml-2">
                  ({group.receipts.length}件)
                </span>
              </h2>
              <div className={`grid ${getGridSizeClass()} gap-4 p-4`}>
                {group.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* 画像表示部分 */}
                    <div
                      className={`${getCardHeightClass()} bg-gray-50 cursor-pointer relative group`}
                      onClick={() => handleOpenPdf(receipt.pdfUrl)}
                    >
                      {/* 読み込み中表示 */}
                      {loadingImages[receipt.id] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}

                      {receipt.thumbnailUrl ? (
                        <div className="h-full w-full flex items-center justify-center overflow-hidden relative">
                          <Image
                            src={receipt.thumbnailUrl}
                            alt={receipt.vendor || "レシート"}
                            fill
                            sizes="(max-width: 768px) 100vw, 25vw"
                            className="object-contain transition duration-300 group-hover:scale-105"
                            onLoadingComplete={() =>
                              handleImageLoaded(receipt.id)
                            }
                            onError={() => handleImageError(receipt.id)}
                          />

                          {/* 改善されたマウスオーバーエフェクト - ぼかし効果 */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm bg-white/30 flex items-center justify-center">
                            <div className="bg-white rounded-full p-3 shadow-lg transform transition duration-300 group-hover:scale-110">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                            </div>
                          </div>
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

                      {/* 日付表示を追加 - 右上に配置 */}
                      <div className="absolute top-2 right-2">
                        <span className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium shadow-sm">
                          {formatDateDisplay(receipt.date)}
                        </span>
                      </div>

                      {/* 授受区分アイコンを左上に表示 */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTransferTypeStyle(
                            receipt.transferType
                          )}`}
                        >
                          {receipt.transferType || "未設定"}
                        </span>
                      </div>
                    </div>

                    {/* レシート情報 - 改善されたレイアウト */}
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3
                          className="font-medium truncate text-blue-700"
                          title={receipt.vendor}
                        >
                          {receipt.vendor || "未設定"}
                        </h3>
                        <span className="text-sm font-bold whitespace-nowrap ml-1 bg-blue-50 px-2 py-0.5 rounded">
                          {receipt.amount
                            ? `¥${receipt.amount.toLocaleString()}`
                            : "¥0"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-1 mb-2">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                          {receipt.type}
                        </span>
                        {receipt.subType && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {receipt.subType}
                          </span>
                        )}
                        {receipt.tag && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                            {receipt.tag}
                          </span>
                        )}
                      </div>

                      {receipt.memo && (
                        <p
                          className="mt-1 text-xs text-gray-600 line-clamp-2"
                          title={receipt.memo}
                        >
                          {receipt.memo}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 表示データ統計 */}
      {!isLoading && filteredReceipts.length > 0 && (
        <div className="mt-6 bg-gray-100 p-3 rounded-md">
          <p className="text-sm text-gray-600">
            表示中: {filteredReceipts.length}件
            {selectedTransferType && `（授受区分: ${selectedTransferType}）`}
            {selectedType && `（種類: ${selectedType}）`}
            {searchQuery && `（検索: "${searchQuery}"）`}
          </p>
        </div>
      )}
    </div>
  );
}
