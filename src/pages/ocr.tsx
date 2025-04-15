// src/pages/ocr.tsx
// import部分は変更なし
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../features/receipts/contexts/ReceiptContext";
import { useClientContext } from "../features/clients/contexts/ClientContext";
import ImageCarousel from "../features/ui/components/ImageCarousel";
import ConfirmDialog from "../shared/components/ConfirmDialog";
import { ReceiptType } from "../features/receipts/types/receipt";
import { useOcr } from "../features/ocr/hooks/useOcr";
import OcrResultDisplay from "../features/ocr/components/OcrResultDisplay"; // 追加
import Image from "next/image";

export default function OcrPage() {
  const router = useRouter();
  const { receipts, updateReceipt } = useReceiptContext();
  const { selectedClientId, clients } = useClientContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(
    null
  ); // 詳細表示用
  const [showResults, setShowResults] = useState(false); // 結果表示フラグ

  // useOcrフックを使用
  const {
    processMultipleReceipts,
    applyOcrResults,
    isProcessing: ocrIsProcessing,
    processedCount: ocrProcessedCount,
    //totalCount,
    ocrResults,
    error: ocrError,
  } = useOcr();

  // 初期化フラグを追加
  const initializedRef = useRef(false);

  // 選択中の顧問先情報
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  // カードサイズのオプションと状態
  const sizeOptions = [
    { value: "small", label: "小" },
    { value: "medium", label: "中", default: true },
    { value: "large", label: "大" },
  ];
  const [cardSize, setCardSize] = useState("medium");

  // レシート種類のオプション
  const typeOptions: ReceiptType[] = [
    "領収書",
    "明細書",
    "契約書",
    "見積書",
    "通帳",
  ];

  // フィルターオプション
  const filterOptions: Array<{ value: string | null; label: string }> = [
    { value: null, label: "すべて" },
    ...typeOptions.map((type) => ({ value: type, label: type })),
  ];

  // 選択したタイプのサブタイプを取得する関数
  const getSubTypesForSelectedType = (type: string | null) => {
    if (!selectedClient || !type) return [];

    const docType = selectedClient.documentTypes.find((dt) => dt.type === type);
    return docType ? docType.subTypes : [];
  };

  // OCRの処理状態を監視して表示に反映
  useEffect(() => {
    if (ocrIsProcessing) {
      setIsProcessing(true);
      setProcessedCount(ocrProcessedCount);
    } else if (isProcessing && !ocrIsProcessing) {
      // OCR処理が完了したら状態を更新
      setIsProcessing(false);
      setShowResults(true); // 処理完了後に結果を表示
    }

    if (ocrError) {
      setError(ocrError);
    }
  }, [ocrIsProcessing, ocrProcessedCount, ocrError, isProcessing]);

  // 初期化時「だけ」に全てのアイテムを選択状態にする
  useEffect(() => {
    // 初回のみ実行し、それ以降はスキップ
    if (!initializedRef.current && receipts.length > 0) {
      setSelectedIds(receipts.map((item) => item.id));
      initializedRef.current = true;
    }
  }, [receipts]);

  // アイテムの選択/選択解除
  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // 全てのアイテムを選択/選択解除
  const toggleSelectAll = (select: boolean) => {
    if (select) {
      const idsToSelect = filteredReceipts.map((item) => item.id);
      setSelectedIds(idsToSelect);
    } else {
      setSelectedIds([]);
    }
  };

  // 種類ボタンのクリックハンドラ
  const handleTypeButtonClick = (
    e: React.MouseEvent,
    id: string,
    type: ReceiptType
  ) => {
    // イベント伝播を止める
    e.stopPropagation();
    e.preventDefault();

    // 種類が変わった場合は、サブタイプをリセット
    const receipt = receipts.find((item) => item.id === id);
    if (receipt && receipt.type !== type) {
      updateReceipt(id, { type, subType: undefined });
    } else {
      updateReceipt(id, { type });
    }
  };

  // サブタイプボタンのクリックハンドラ
  const handleSubTypeButtonClick = (
    e: React.MouseEvent,
    id: string,
    subType: string
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const receipt = receipts.find((item) => item.id === id);
    if (receipt && receipt.subType === subType) {
      // 同じサブタイプがすでに選択されている場合は解除
      updateReceipt(id, { subType: undefined });
    } else {
      // それ以外の場合は新しいサブタイプを設定
      updateReceipt(id, { subType });
    }
  };

  // OCR実行の処理
  const runOcr = async () => {
    if (selectedIds.length === 0) {
      setError("処理するアイテムを選択してください");
      return;
    }

    setError(null);
    setShowResults(false); // 結果表示をリセット

    try {
      // 選択されたアイテムのみ処理
      const selectedItems = receipts.filter((item) =>
        selectedIds.includes(item.id)
      );

      // OCR処理を実行
      await processMultipleReceipts(selectedItems);

      // 処理が完了したら最初のアイテムを選択
      if (selectedItems.length > 0) {
        setSelectedReceiptId(selectedItems[0].id);
      }
    } catch (err) {
      console.error("OCR処理中にエラーが発生:", err);
      setError("OCR処理中にエラーが発生しました");
    }
  };

  // OCR結果を適用する
  const applyOcrResult = (receiptId: string) => {
    if (ocrResults[receiptId]) {
      const updates = applyOcrResults(receiptId, ocrResults[receiptId]);
      updateReceipt(receiptId, {
        ...updates,
        // サムネイルURLがある場合は保持
        thumbnailUrl:
          sessionStorage.getItem(`thumbnail_${receiptId}`) ||
          receipts.find((r) => r.id === receiptId)?.thumbnailUrl,
      });
    }
  };

  // 全ての結果を適用
  const applyAllResults = () => {
    selectedIds.forEach((id) => {
      if (ocrResults[id]) {
        applyOcrResult(id);
      }
    });

    alert(`${Object.keys(ocrResults).length}件のOCR結果を適用しました`);

    // 処理完了後、レビューページへ
    router.push("/review");
  };

  // 表示するアイテムをフィルタリング
  const filteredReceipts =
    typeFilter === null
      ? receipts
      : receipts.filter((item) => item.type === typeFilter);

  // 現在選択中のレシート - 使用するか削除します
  /*
const selectedReceipt = selectedReceiptId 
  ? receipts.find(r => r.id === selectedReceiptId) 
  : null;
*/
  // サムネイルURLを取得
  const getThumbnailUrl = (receiptId: string): string | undefined => {
    // セッションストレージから取得を試みる
    const storedThumbnail = sessionStorage.getItem(`thumbnail_${receiptId}`);
    if (storedThumbnail) {
      return storedThumbnail;
    }

    // レシートのプロパティから取得
    const receipt = receipts.find((r) => r.id === receiptId);
    return receipt?.thumbnailUrl || undefined;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24">
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

      {/* フィルターとサイズ選択 */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        {/* 種類フィルター */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">種類:</span>
          <div className="flex border rounded overflow-hidden">
            {filterOptions.map((option) => (
              <button
                key={option.value || "all"}
                onClick={() => setTypeFilter(option.value)}
                className={`px-3 py-1 text-sm ${
                  typeFilter === option.value
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* カードサイズ選択 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">サイズ:</span>
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
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 選択アクション */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="select-all"
            checked={
              selectedIds.length > 0 &&
              selectedIds.length === filteredReceipts.length
            }
            onChange={(e) => toggleSelectAll(e.target.checked)}
            className="mr-2 h-5 w-5 cursor-pointer"
          />
          <label htmlFor="select-all" className="text-sm cursor-pointer">
            {selectedIds.length > 0 &&
            selectedIds.length === filteredReceipts.length
              ? "すべて選択解除"
              : "すべて選択"}
          </label>
        </div>

        <span className="text-sm text-gray-500">
          {selectedIds.length} / {filteredReceipts.length} アイテムを選択中
        </span>
      </div>

      {/* 確認ダイアログ */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          title="OCR処理を開始"
          message={`${selectedIds.length}個のドキュメントに対してOCR処理を実行します。処理には時間がかかる場合があります。`}
          confirmLabel="開始"
          cancelLabel="キャンセル"
          onConfirm={() => {
            setIsConfirmDialogOpen(false);
            runOcr();
          }}
          onCancel={() => setIsConfirmDialogOpen(false)}
        />
      )}

      {/* OCR結果表示セクション - 処理完了後に表示 */}
      {showResults && Object.keys(ocrResults).length > 0 && (
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">OCR処理結果</h2>

          {/* タブ形式で結果選択 */}
          <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto border-b pb-2">
            {selectedIds.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedReceiptId(id)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedReceiptId === id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {receipts.find((r) => r.id === id)?.vendor ||
                  `ID: ${id.substring(0, 6)}...`}
              </button>
            ))}
          </div>

          {/* 選択中のレシートの結果表示 */}
          {selectedReceiptId && ocrResults[selectedReceiptId] && (
            <OcrResultDisplay
              result={ocrResults[selectedReceiptId]}
              thumbnailUrl={getThumbnailUrl(selectedReceiptId)}
              onApply={() => applyOcrResult(selectedReceiptId)}
            />
          )}

          {/* 全て適用ボタン */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={applyAllResults}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              すべての結果を適用してレビューへ進む
            </button>
          </div>
        </div>
      )}

      {/* 処理対象ドキュメント一覧 - カードサイズに応じてグリッドを調整 */}
      <div
        className={`grid ${
          cardSize === "small"
            ? "grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : cardSize === "medium"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 lg:grid-cols-2"
        } gap-4`}
      >
        {filteredReceipts.map((item) => (
          <div key={item.id} className="border p-4 rounded relative bg-white">
            {/* カードの選択可能領域 */}
            <div
              className={`${
                selectedIds.includes(item.id)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-300"
              } border p-2 rounded cursor-pointer mb-3`}
              onClick={() => toggleItemSelection(item.id)}
            >
              {/* チェックボックス */}
              <div className="mb-2 flex justify-between items-center">
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  ID: {item.id.substring(0, 8)}...
                </p>
              </div>

              {/* 画像カルーセル */}
              {item.imageUrls && item.imageUrls.length > 0 && (
                <div>
                  <ImageCarousel
                    images={item.imageUrls}
                    className={`${
                      cardSize === "small"
                        ? "h-24"
                        : cardSize === "medium"
                        ? "h-40"
                        : "h-60"
                    }`}
                  />
                </div>
              )}

              {/* サムネイル表示 - セッションストレージまたはプロパティから */}
              {(!item.imageUrls || item.imageUrls.length === 0) &&
                item.thumbnailUrl && (
                  <div
                    className={`${
                      cardSize === "small"
                        ? "h-24"
                        : cardSize === "medium"
                        ? "h-40"
                        : "h-60"
                    } bg-gray-50 flex items-center justify-center`}
                  >
                    <Image
                      src={item.thumbnailUrl}
                      alt="サムネイル"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
            </div>

            {/* 種類選択部分 - クリック時にカード選択動作を起こさないようにする */}
            <div
              className="mt-2 border-t pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-gray-500 mb-1">種類を選択：</p>
              <div className="flex flex-wrap gap-1">
                {typeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={(e) => handleTypeButtonClick(e, item.id, type)}
                    className={`px-2 py-1 text-xs rounded ${
                      item.type === type
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* サブタイプ選択 - 選択した種類にサブタイプがある場合のみ表示 */}
              {item.type &&
                getSubTypesForSelectedType(item.type).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">
                      サブタイプを選択：
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getSubTypesForSelectedType(item.type).map((subType) => (
                        <button
                          key={subType}
                          onClick={(e) =>
                            handleSubTypeButtonClick(e, item.id, subType)
                          }
                          className={`px-2 py-1 text-xs rounded ${
                            item.subType === subType
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          type="button"
                        >
                          {subType}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {receipts.length === 0 && (
        <div className="text-center p-8 bg-gray-100 rounded-lg">
          <p>処理対象のドキュメントがありません。</p>
          <button
            onClick={() => router.push("/group")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            type="button"
          >
            グループ化ページへ
          </button>
        </div>
      )}

      {/* OCR処理中のプログレスバー（処理中のみ表示） */}
      {isProcessing && (
        <div className="fixed top-0 left-0 w-full z-50 bg-white shadow-md p-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">OCR処理中...</h3>
              <span className="text-sm text-gray-600">
                {processedCount}/{selectedIds.length} 完了
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: `${(processedCount / selectedIds.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* 固定ボタンエリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {selectedIds.length > 0 ? (
            <button
              onClick={() => setIsConfirmDialogOpen(true)}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
              type="button"
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
                  処理中... {processedCount}/{selectedIds.length}
                </>
              ) : (
                `${selectedIds.length}アイテムのOCR処理を実行`
              )}
            </button>
          ) : (
            <span className="text-gray-500">
              OCR処理するアイテムを選択してください
            </span>
          )}

          <button
            onClick={() => router.push("/review")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            type="button"
          >
            次へ：レビュー
          </button>
        </div>
      </div>
    </div>
  );
}
