// src/pages/export.tsx
import { useState, useEffect, useMemo } from "react";
import { useReceiptContext } from "../features/receipts/contexts/ReceiptContext";
import { useClientContext } from "../features/clients/contexts/ClientContext";
import {
  useSupabaseSync,
  SupabaseSyncOptions,
} from "../features/supabase/hooks/useSupabaseSync";
import ConfirmDialog from "../shared/components/ConfirmDialog";
import Link from "next/link";

export default function ExportPage() {
  const { receipts, updateReceipt, removeReceipt } = useReceiptContext();
  const { clients, selectedClientId } = useClientContext();
  const {
    syncReceiptsToSupabase,
    isSyncing,
    error: syncError,
    syncStatus,
  } = useSupabaseSync();

  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [receiptSelection, setReceiptSelection] = useState<{
    [id: string]: boolean;
  }>({});
  const [selectAll, setSelectAll] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());

  // 確認済みアイテムの読み込み
  useEffect(() => {
    const storedConfirmed = sessionStorage.getItem("confirmedItems");
    if (storedConfirmed) {
      try {
        // JSON.parseの結果を明示的に型指定
        const parsed: string[] = JSON.parse(storedConfirmed);
        const confirmedSet = new Set<string>(parsed);
        setConfirmedItems(confirmedSet);
      } catch (e) {
        console.error("Failed to parse confirmed items from storage:", e);
      }
    }
  }, []);

  // レビューページで確認済み（isConfirmed=true）かつステータスが「完了」のアイテムのみを表示
  const confirmedReceipts = useMemo(() => {
    return receipts.filter(
      (receipt) => confirmedItems.has(receipt.id) && receipt.status === "完了"
    );
  }, [receipts, confirmedItems]);

  // 選択状態の初期化 - 依存配列を確認し、receiptsのIDだけに依存するように修正
  useEffect(() => {
    const receiptIds = confirmedReceipts.map((receipt) => receipt.id);
    // 現在の選択状態を保持しつつ、新しいIDのみ追加
    setReceiptSelection((prev) => {
      const newSelection = { ...prev };
      receiptIds.forEach((id) => {
        if (newSelection[id] === undefined) {
          newSelection[id] = false;
        }
      });
      return newSelection;
    });
  }, [confirmedReceipts]);

  // 全選択/全解除
  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    const newSelection = { ...receiptSelection };
    confirmedReceipts.forEach((receipt) => {
      newSelection[receipt.id] = checked;
    });
    setReceiptSelection(newSelection);
  };

  // 個別選択の切り替え
  const handleReceiptSelectionChange = (id: string, checked: boolean) => {
    setReceiptSelection({ ...receiptSelection, [id]: checked });

    // 全選択状態を更新
    if (!checked) {
      setSelectAll(false);
    } else {
      const allSelected = confirmedReceipts.every(
        (receipt) => receiptSelection[receipt.id] || receipt.id === id
      );
      setSelectAll(allSelected);
    }
  };

  // 確認済み状態を解除する関数
  const toggleConfirmed = (id: string) => {
    setConfirmedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // セッションストレージにも保存
      sessionStorage.setItem("confirmedItems", JSON.stringify([...newSet]));
      return newSet;
    });

    // 確認済みフラグをアップデート
    updateReceipt(id, { isConfirmed: false });
  };

  // Supabaseにエクスポート
  const handleExportToSupabase = async () => {
    setIsConfirmDialogOpen(false);
    setError(null);

    try {
      // 選択された顧問先の確認
      if (!selectedClientId) {
        throw new Error("顧問先を選択してください");
      }

      const client = clients.find((c) => c.id === selectedClientId);
      if (!client) {
        throw new Error("選択された顧問先が見つかりません");
      }

      // 選択されたレシートを抽出
      const selectedReceiptIds = Object.entries(receiptSelection)
        .filter(([, selected]) => selected)
        .map(([id]) => id);

      if (selectedReceiptIds.length === 0) {
        throw new Error("エクスポートするアイテムを選択してください");
      }

      const selectedReceipts = confirmedReceipts.filter((receipt) =>
        selectedReceiptIds.includes(receipt.id)
      );

      // 各レシートの授受区分をチェック
      if (selectedReceipts.some((receipt) => !receipt.transferType)) {
        throw new Error(
          "一部のレシートに授受区分が設定されていません。アップロードし直してください。"
        );
      }

      // 各レシートごとに個別の授受区分とサブタイプを使用してエクスポート
      let successCount = 0;
      let failedCount = 0;

      for (const receipt of selectedReceipts) {
        // 各レシートの授受区分とサブタイプを使用
        const syncOptions: SupabaseSyncOptions = {
          transferType: receipt.transferType || "受取", // デフォルト値を設定
          subType: receipt.subType || undefined,
        };

        // 1件ずつエクスポート
        const result = await syncReceiptsToSupabase(
          [receipt],
          client,
          syncOptions
        );

        successCount += result.success;
        failedCount += result.failed;
      }

      // 登録に成功したアイテムをクリア
      if (successCount > 0) {
        const exportedIds = selectedReceipts
          .filter((_, index) => index < successCount)
          .map((receipt) => receipt.id);

        // BlobURLの解放
        exportedIds.forEach((id) => {
          const receipt = receipts.find((r) => r.id === id);
          if (receipt) {
            if (receipt.imageUrls) {
              receipt.imageUrls.forEach((url) => {
                if (url.startsWith("blob:")) {
                  try {
                    URL.revokeObjectURL(url);
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
          }

          // 確認済みリストからも削除
          setConfirmedItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            // セッションストレージにも保存
            sessionStorage.setItem(
              "confirmedItems",
              JSON.stringify([...newSet])
            );
            return newSet;
          });

          // レシートを削除
          removeReceipt(id);
        });

        // 選択状態を更新
        const newSelection = { ...receiptSelection };
        exportedIds.forEach((id) => {
          delete newSelection[id];
        });
        setReceiptSelection(newSelection);
      }

      // 結果をユーザーに表示
      alert(`エクスポート完了: ${successCount}件成功, ${failedCount}件失敗`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`エクスポート中にエラーが発生しました: ${errorMessage}`);
    }
  };

  // 選択済みアイテム数を計算
  const selectedCount = Object.values(receiptSelection).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Supabaseエクスポート</h1>

      {(error || syncError) && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error || syncError}
          <button
            onClick={() => {
              setError(null);
            }}
            className="ml-2 text-red-700 hover:text-red-900"
            aria-label="エラーメッセージを閉じる"
          >
            ×
          </button>
        </div>
      )}

      {/* 顧問先情報 */}
      {selectedClientId ? (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">選択中の顧問先</h2>
          <p className="text-blue-700 font-medium">
            {clients.find((c) => c.id === selectedClientId)?.name}
          </p>
        </div>
      ) : (
        <div className="mb-6 bg-red-50 p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            顧問先が選択されていません
          </h2>
          <Link href="/" className="text-blue-600 hover:underline">
            トップページで顧問先を選択してください
          </Link>
        </div>
      )}

      {/* 確認ダイアログ */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          title="Supabaseへ登録"
          message={`選択した${selectedCount}件のレシートをSupabaseデータベースにエクスポートします。この操作は取り消せません。`}
          confirmLabel="エクスポート"
          cancelLabel="キャンセル"
          onConfirm={handleExportToSupabase}
          onCancel={() => setIsConfirmDialogOpen(false)}
          extraContent={
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded">
              <p className="font-medium">エクスポート情報:</p>
              <ul className="mt-1 text-sm">
                <li>
                  顧問先: {clients.find((c) => c.id === selectedClientId)?.name}
                </li>
                <li>選択アイテム: {selectedCount}件</li>
                <li>授受区分: アップロード時に設定した値を使用します</li>
                <li className="mt-2 text-red-600">
                  注意: 登録したアイテムは自動的に削除されます
                </li>
              </ul>
            </div>
          }
        />
      )}

      {/* レシート選択 */}
      <div className="mb-20">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">
            登録可能なアイテム（確認済みかつレビュー完了のもの）
          </h2>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="select-all"
              checked={selectAll}
              onChange={(e) => handleSelectAllChange(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="select-all">全選択</label>
          </div>
        </div>

        {confirmedReceipts.length === 0 ? (
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-yellow-700">登録可能なデータがありません</p>
            <p className="text-sm text-gray-600 mt-2">
              レビューページで確認済みに設定したアイテムが表示されます
            </p>
            <Link
              href="/review"
              className="mt-3 text-blue-600 hover:underline inline-block"
            >
              レビューページへ
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-3 py-3"></th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日付
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    取引先
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    種類
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    授受区分
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タグ
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メモ
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    確認状態
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {confirmedReceipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className={receiptSelection[receipt.id] ? "bg-blue-50" : ""}
                    onClick={() =>
                      handleReceiptSelectionChange(
                        receipt.id,
                        !receiptSelection[receipt.id]
                      )
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={receiptSelection[receipt.id] || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleReceiptSelectionChange(
                            receipt.id,
                            e.target.checked
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {receipt.date || "日付なし"}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {receipt.vendor || "未設定"}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {receipt.amount
                        ? `¥${receipt.amount.toLocaleString()}`
                        : "¥0"}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {receipt.type}
                      {receipt.subType && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({receipt.subType})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          receipt.transferType === "受取"
                            ? "bg-green-100 text-green-800"
                            : receipt.transferType === "渡し"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {receipt.transferType || "未設定"}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {receipt.tag || "未設定"}
                    </td>
                    <td className="px-3 py-4 max-w-xs truncate">
                      {receipt.memo || "なし"}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleConfirmed(receipt.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        確認を解除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 固定エクスポートボタン */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-gray-500">{selectedCount}件選択中</span>

          <button
            onClick={() => setIsConfirmDialogOpen(true)}
            disabled={isSyncing || !selectedClientId || selectedCount === 0}
            className={`px-6 py-2 rounded font-medium
              ${
                isSyncing || !selectedClientId || selectedCount === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }
            `}
          >
            {isSyncing ? (
              <span className="flex items-center">
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
                エクスポート中... {syncStatus.success}/
                {syncStatus.success + syncStatus.failed}
              </span>
            ) : (
              "Supabaseに登録"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
