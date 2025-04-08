// src/pages/review.tsx
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../contexts/ReceiptContext";
import { useClientContext } from "../contexts/ClientContext";
import { useReloadWarning } from "../hooks/useReloadWarning";
import ConfirmDialog from "../components/ConfirmDialog";
import ImageCarousel from "../components/ImageCarousel";
import { ReceiptItem, ReceiptType, TransferType } from "../types/receipt";
import Link from "next/link";

export default function ReviewPage() {
  const router = useRouter();
  const { receipts, updateReceipt, removeReceipt, clearReceipts } =
    useReceiptContext();
  const { selectedClientId, clients } = useClientContext();
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] =
    useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());

  // リロード警告を有効化（データがある場合のみ）
  useReloadWarning(
    receipts.length > 0,
    "ページをリロードすると画像とPDFが表示できなくなる可能性があります。続けますか？"
  );

  // 選択中の顧問先情報
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  // 未確認アイテムのみをフィルタリング
  const unconfirmedReceipts = useMemo(() => {
    return receipts.filter((receipt) => !confirmedItems.has(receipt.id));
  }, [receipts, confirmedItems]);

  // 現在のレシート - 未確認のもののみから選択
  const currentReceipt = unconfirmedReceipts[currentIndex] || null;

  // データが存在しない場合のインデックス調整
  useEffect(() => {
    if (unconfirmedReceipts.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= unconfirmedReceipts.length) {
      setCurrentIndex(Math.max(0, unconfirmedReceipts.length - 1));
    }
  }, [unconfirmedReceipts, currentIndex]);

  // 初期表示時にisConfirmedフラグがついているアイテムを確認済みセットに追加
  useEffect(() => {
    const newConfirmedItems = new Set<string>();
    receipts.forEach((receipt) => {
      if (receipt.isConfirmed) {
        newConfirmedItems.add(receipt.id);
      }
    });
    setConfirmedItems(newConfirmedItems);
  }, [receipts]);

  // PDFを開く処理
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

  // アイテムを削除
  const handleDeleteItem = (id: string) => {
    setIsConfirmDialogOpen(false);

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

    // 確認済みアイテムリストからも削除
    setConfirmedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    // コンテキスト経由で削除
    removeReceipt(id);

    // インデックスを調整
    if (currentIndex >= receipts.length - 1) {
      setCurrentIndex(Math.max(0, receipts.length - 2));
    }
  };

  // すべてのデータをクリア
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
    // 確認済みアイテムもクリア
    setConfirmedItems(new Set());
  };

  // フィールド更新
  const handleUpdateField = <K extends keyof ReceiptItem>(
    field: K,
    value: ReceiptItem[K]
  ) => {
    if (!currentReceipt) return;
    updateReceipt(currentReceipt.id, { [field]: value });
  };

  // アイテムを確認済みとしてマーク
  const toggleConfirmed = (id: string) => {
    // 現在のアイテムが要質問の場合は確認済みにできない
    const receipt = receipts.find((r) => r.id === id);
    if (receipt && receipt.status === "要質問") {
      return; // 要質問の場合は何もしない
    }

    // isConfirmedフラグを更新
    updateReceipt(id, { isConfirmed: !confirmedItems.has(id) });

    setConfirmedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // セッションストレージに保存
      sessionStorage.setItem("confirmedItems", JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // 前のアイテムへ移動
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 次のアイテムへ移動
  const goToNext = () => {
    if (currentIndex < unconfirmedReceipts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Supabase登録ページへ移動
  const goToExport = () => {
    router.push("/export");
  };

  // 種類のオプション
  const typeOptions: ReceiptType[] = [
    "領収書",
    "明細書",
    "契約書",
    "見積書",
    "通帳",
  ];

  // 授受区分のオプション
  const transferTypeOptions: TransferType[] = ["受取", "渡し", "内部資料"];

  // 選択したタイプのサブタイプを取得する関数
  const getSubTypesForSelectedType = (type: string | null) => {
    if (!selectedClient || !type) return [];

    const docType = selectedClient.documentTypes.find((dt) => dt.type === type);
    return docType ? docType.subTypes : [];
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">OCR結果の確認と編集</h1>

        <div className="flex gap-2">
          {receipts.length > 0 && (
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

      {/* 進捗状況と登録ボタン */}
      {receipts.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-2 sm:mb-0">
            {unconfirmedReceipts.length > 0 ? (
              <p className="font-medium">
                {currentIndex + 1} / {unconfirmedReceipts.length} アイテム表示中
              </p>
            ) : (
              <p className="font-medium text-green-600">
                すべてのアイテムが確認済みです
              </p>
            )}
            <p className="text-sm text-gray-600">
              {confirmedItems.size} / {receipts.length} アイテム確認済み
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={goToExport}
              disabled={confirmedItems.size === 0}
              className={`px-4 py-2 rounded font-medium ${
                confirmedItems.size === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {confirmedItems.size > 0
                ? `${confirmedItems.size}件をデータベース登録へ`
                : "確認済みアイテムがありません"}
            </button>
          </div>
        </div>
      )}

      {receipts.length > 0 && unconfirmedReceipts.length === 0 && (
        <div className="mb-6 p-8 bg-green-50 rounded-lg text-center">
          <p className="mb-2 text-green-700 font-medium">
            すべてのアイテムが確認済みです！
          </p>
          <p className="mb-4 text-gray-600">
            確認済みアイテムをエクスポートするか、アップロードページから新しいアイテムを追加してください。
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/export"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
            >
              エクスポートページへ
            </Link>
            <Link
              href="/upload"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 inline-block"
            >
              アップロードページへ
            </Link>
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

      {/* アイテム表示部分 */}
      {currentReceipt && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* ヘッダー部分：ID、削除ボタン */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="mr-2">
                  <input
                    type="checkbox"
                    id="confirm-checkbox"
                    checked={confirmedItems.has(currentReceipt.id)}
                    onChange={() => toggleConfirmed(currentReceipt.id)}
                    disabled={currentReceipt.status === "要質問"}
                    className={`h-5 w-5 ${
                      currentReceipt.status === "要質問"
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer"
                    }`}
                  />
                </div>
                <label
                  htmlFor="confirm-checkbox"
                  className={`font-medium ${
                    currentReceipt.status === "要質問"
                      ? "cursor-not-allowed text-gray-500"
                      : "cursor-pointer"
                  } ${
                    confirmedItems.has(currentReceipt.id)
                      ? "text-green-600"
                      : "text-gray-800"
                  }`}
                >
                  {confirmedItems.has(currentReceipt.id)
                    ? "✓ 確認済み"
                    : currentReceipt.status === "要質問"
                    ? "要質問（確認済みにできません）"
                    : "未確認"}
                </label>
                <span className="ml-4 text-sm text-gray-500">
                  ID: {currentReceipt.id.substring(0, 8)}...
                </span>
              </div>
              <button
                onClick={() => handleDeleteItem(currentReceipt.id)}
                className="text-red-500 hover:text-red-700 p-1"
                aria-label="削除"
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
            </div>

            {/* コンテンツ部分：画像と入力フォーム */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* 左側：画像カルーセル */}
              <div className="w-full md:w-1/2">
                {currentReceipt.imageUrls &&
                currentReceipt.imageUrls.length > 0 ? (
                  <div>
                    <ImageCarousel
                      images={currentReceipt.imageUrls}
                      className="h-120"
                    />
                    {currentReceipt.pdfUrl && (
                      <button
                        onClick={() => handleOpenPdf(currentReceipt.pdfUrl)}
                        className="mt-2 text-blue-600 underline text-sm hover:text-blue-800 flex items-center justify-center w-full"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
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
                        PDFを開く
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center bg-gray-100 rounded">
                    <p className="text-gray-500">画像がありません</p>
                  </div>
                )}
              </div>

              {/* 右側：入力フォーム */}
              <div className="w-full md:w-1/2">
                {/* 授受区分ボタン選択 */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">授受区分：</p>
                  <div className="flex flex-wrap gap-2">
                    {transferTypeOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleUpdateField("transferType", type)}
                        className={`px-3 py-2 rounded text-sm ${
                          currentReceipt.transferType === type
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        type="button"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 種類ボタン選択 */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">種類：</p>
                  <div className="flex flex-wrap gap-2">
                    {typeOptions.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleUpdateField("type", type)}
                        className={`px-3 py-2 rounded text-sm ${
                          currentReceipt.type === type
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        type="button"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* サブタイプボタン選択 - 選択されたtypeにサブタイプがある場合のみ表示 */}
                {currentReceipt.type &&
                  getSubTypesForSelectedType(currentReceipt.type).length >
                    0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">サブタイプ：</p>
                      <div className="flex flex-wrap gap-2">
                        {getSubTypesForSelectedType(currentReceipt.type).map(
                          (subType) => (
                            <button
                              key={subType}
                              onClick={() =>
                                handleUpdateField("subType", subType)
                              }
                              className={`px-3 py-2 rounded text-sm ${
                                currentReceipt.subType === subType
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                              type="button"
                            >
                              {subType}
                            </button>
                          )
                        )}
                        {/* サブタイプをクリアするボタン */}
                        {currentReceipt.subType && (
                          <button
                            onClick={() => handleUpdateField("subType", "")}
                            className="px-3 py-2 rounded text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
                            type="button"
                          >
                            クリア
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 日付フィールド */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      日付
                    </label>
                    <input
                      type="date"
                      value={currentReceipt.date || ""}
                      onChange={(e) =>
                        handleUpdateField("date", e.target.value)
                      }
                      className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* 取引先フィールド - 授受区分に応じてラベルを変更 */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {currentReceipt.transferType === "受取"
                        ? "取引先"
                        : currentReceipt.transferType === "渡し"
                        ? "種類"
                        : "種類"}
                    </label>
                    <input
                      type="text"
                      value={currentReceipt.vendor || ""}
                      placeholder={
                        currentReceipt.transferType === "受取"
                          ? "取引先"
                          : currentReceipt.transferType === "渡し"
                          ? "申告書etc"
                          : "根拠資料etc"
                      }
                      onChange={(e) =>
                        handleUpdateField("vendor", e.target.value)
                      }
                      className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* 金額フィールド */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      金額
                    </label>
                    <input
                      type="number"
                      value={currentReceipt.amount || ""}
                      placeholder="金額"
                      onChange={(e) =>
                        handleUpdateField("amount", Number(e.target.value))
                      }
                      className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* タグフィールド */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      タグ
                    </label>
                    <input
                      type="text"
                      value={currentReceipt.tag || ""}
                      placeholder="タグ（交際費など）"
                      onChange={(e) => handleUpdateField("tag", e.target.value)}
                      className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* ステータスチェックボックス */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      ステータス
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="status-complete"
                          checked={currentReceipt.status === "完了"}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleUpdateField("status", "完了");
                            }
                          }}
                          className="mr-2 h-5 w-5"
                        />
                        <label
                          htmlFor="status-complete"
                          className="text-sm cursor-pointer"
                        >
                          完了
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="status-question"
                          checked={currentReceipt.status === "要質問"}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleUpdateField("status", "要質問");
                              // 確認済みから外す
                              if (confirmedItems.has(currentReceipt.id)) {
                                toggleConfirmed(currentReceipt.id);
                              }
                            }
                          }}
                          className="mr-2 h-5 w-5"
                        />
                        <label
                          htmlFor="status-question"
                          className="text-sm cursor-pointer"
                        >
                          要質問
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* メモフィールド */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      メモ
                    </label>
                    <textarea
                      value={currentReceipt.memo || ""}
                      placeholder="メモ"
                      onChange={(e) =>
                        handleUpdateField("memo", e.target.value)
                      }
                      className="border p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
                    />
                  </div>
                </div>

                {/* 更新日時表示 */}
                {currentReceipt.updatedAt && (
                  <p className="text-xs text-gray-500 mt-4">
                    最終更新: {currentReceipt.updatedAt}
                  </p>
                )}
              </div>
            </div>

            {/* ナビゲーションボタン */}
            <div className="flex justify-between mt-6">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className={`px-4 py-2 rounded ${
                  currentIndex === 0
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ← 前へ
              </button>
              <button
                onClick={() => toggleConfirmed(currentReceipt.id)}
                disabled={currentReceipt.status === "要質問"}
                className={`px-4 py-2 rounded ${
                  currentReceipt.status === "要質問"
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : confirmedItems.has(currentReceipt.id)
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                {confirmedItems.has(currentReceipt.id)
                  ? "確認済み ✓"
                  : currentReceipt.status === "要質問"
                  ? "要質問を解決してください"
                  : "確認済みにする"}
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === unconfirmedReceipts.length - 1}
                className={`px-4 py-2 rounded ${
                  currentIndex === unconfirmedReceipts.length - 1
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                次へ →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認済みアイテム一覧 */}
      {confirmedItems.size > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">確認済みアイテム一覧</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取引先
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    種類
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts
                  .filter((receipt) => confirmedItems.has(receipt.id))
                  .map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setCurrentIndex(
                          receipts.findIndex((r) => r.id === receipt.id)
                        )
                      }
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {receipt.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {receipt.date || "未設定"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {receipt.vendor || "未設定"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {receipt.amount
                          ? `¥${receipt.amount.toLocaleString()}`
                          : "未設定"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {receipt.type || "領収書"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleConfirmed(receipt.id);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          確認解除
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
    </div>
  );
}
