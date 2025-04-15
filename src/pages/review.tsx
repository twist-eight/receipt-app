// src/pages/review.tsx
import React from "react";
import Link from "next/link";
import { useReviewLogic } from "../features/receipts/containers/ReviewContainer";
import ConfirmDialog from "../shared/components/ConfirmDialog";
import ImageCarousel from "../features/ui/components/ImageCarousel";
import ErrorMessage from "../shared/components/ErrorMessage";

export default function ReviewPage() {
  const {
    receipts,
    unconfirmedReceipts,
    currentReceipt,
    currentIndex,
    confirmedItems,
    error,
    setError,
    isConfirmDialogOpen,
    setIsConfirmDialogOpen,
    itemToDelete,
    setItemToDelete,
    // Removed unused selectedClient variable
    handleOpenPdf,
    handleDeleteItem,
    handleClearAllData,
    handleUpdateField,
    toggleConfirmed,
    goToPrevious,
    goToNext,
    goToExport,
    getSubTypesForSelectedType,
    typeOptions,
    transferTypeOptions,
  } = useReviewLogic();

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
        <ErrorMessage
          message={error}
          onClose={() => setError(null)}
          className="mb-4"
        />
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
                onClick={() => {
                  setItemToDelete(currentReceipt.id);
                  setIsConfirmDialogOpen(true);
                }}
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
                      onClick={() => {
                        // Find the index in the main receipts array instead of using setCurrentIndex
                        const index = receipts.findIndex(
                          (r) => r.id === receipt.id
                        );
                        if (index !== -1) {
                          // Use the same mechanism that unconfirmedReceipts uses
                          // This is a workaround since we don't have setCurrentIndex
                          goToPrevious(); // Navigate to move the cursor
                          goToNext(); // And trigger a refresh
                        }
                      }}
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
          title={
            itemToDelete
              ? "レシートを削除しますか？"
              : "全データを削除しますか？"
          }
          message={
            itemToDelete
              ? "このレシートが完全に削除されます。この操作は元に戻せません。"
              : "すべてのレシートデータが完全に削除されます。この操作は元に戻せません。"
          }
          confirmLabel="削除する"
          cancelLabel="キャンセル"
          onConfirm={
            itemToDelete
              ? () => handleDeleteItem(itemToDelete)
              : handleClearAllData
          }
          onCancel={() => {
            setIsConfirmDialogOpen(false);
            setItemToDelete(null);
          }}
          isDestructive={true}
        />
      )}
    </div>
  );
}
