import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useReceiptContext } from "../contexts/ReceiptContext";
import { useClientContext } from "../contexts/ClientContext";
import { useSupabaseSync, SupabaseSyncOptions } from "../hooks/useSupabaseSync";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ExportPage() {
  const router = useRouter();
  const { receipts } = useReceiptContext();
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const [globalSupabaseApiKey, setGlobalSupabaseApiKey] = useState("");
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

  // 授受区分のオプション
  const transferTypeOptions = ["受取", "渡し"];
  const [selectedTransferType, setSelectedTransferType] = useState("受取");

  // サブタイプ選択
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);

  // APIキーの保存と読み取り
  useEffect(() => {
    const savedApiKey = localStorage.getItem("supabaseApiKey");
    if (savedApiKey) {
      setGlobalSupabaseApiKey(savedApiKey);
    }
  }, []);

  // 選択状態の初期化
  useEffect(() => {
    const initialSelection = receipts.reduce((acc, receipt) => {
      acc[receipt.id] = false;
      return acc;
    }, {} as { [id: string]: boolean });
    setReceiptSelection(initialSelection);
  }, [receipts]);

  // 選択中の顧問先が変更されたらドキュメント種類もリセット
  useEffect(() => {
    if (selectedClientId) {
      setSelectedDocType(null);
      setSelectedSubType(null);
    }
  }, [selectedClientId]);

  // APIキーの保存
  const handleSaveApiKey = () => {
    localStorage.setItem("supabaseApiKey", globalSupabaseApiKey);
    alert("API Keyが保存されました");
  };

  // 全選択/全解除
  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    const newSelection = { ...receiptSelection };
    receipts.forEach((receipt) => {
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
      const allSelected = Object.values({
        ...receiptSelection,
        [id]: checked,
      }).every((selected) => selected);
      setSelectAll(allSelected);
    }
  };

  // 現在の顧問先のドキュメントタイプを取得
  const getCurrentClientDocTypes = () => {
    if (!selectedClientId) return [];
    const client = clients.find((c) => c.id === selectedClientId);
    return client ? client.documentTypes : [];
  };

  // 選択されたドキュメントタイプのサブタイプを取得
  const getSubTypesForSelectedDocType = () => {
    if (!selectedDocType) return [];
    const docTypes = getCurrentClientDocTypes();
    const docType = docTypes.find((dt) => dt.type === selectedDocType);
    return docType ? docType.subTypes : [];
  };

  // ドキュメント種類の選択時
  const handleDocTypeChange = (type: string) => {
    setSelectedDocType(type);
    setSelectedSubType(null); // サブタイプをリセット
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

      const selectedReceipts = receipts.filter((receipt) =>
        selectedReceiptIds.includes(receipt.id)
      );

      // Supabaseのオプションを設定
      const syncOptions: SupabaseSyncOptions = {
        transferType: selectedTransferType,
        subType: selectedSubType || undefined,
      };

      // Supabaseにエクスポート
      const result = await syncReceiptsToSupabase(
        selectedReceipts,
        client,
        syncOptions
      );

      // 結果をユーザーに表示
      alert(
        `エクスポート完了: ${result.success}件成功, ${result.failed}件失敗`
      );

      // 進捗状況を表示するためにsyncStatusを使用
      if (syncStatus.failed > 0) {
        console.log(
          `一部のアイテムがエクスポートできませんでした: ${
            syncStatus.success
          }/${syncStatus.success + syncStatus.failed} 成功`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`エクスポート中にエラーが発生しました: ${errorMessage}`);
    }
  };

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

      {/* Supabase API設定 */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Supabase接続</h2>
        <p className="text-sm text-gray-600 mb-2">
          環境変数で設定されたSupabase接続を使用します。設定済みのプロジェクトで動作します。
        </p>
      </div>

      {/* 顧問先選択 */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-2">顧問先選択</h2>
        {clients.length === 0 ? (
          <div>
            <p className="text-gray-500 mb-2">顧問先が登録されていません</p>
            <button
              onClick={() => router.push("/clients")}
              className="text-blue-600 hover:underline"
            >
              顧問先設定ページで登録する
            </button>
          </div>
        ) : (
          <select
            value={selectedClientId || ""}
            onChange={(e) => setSelectedClientId(e.target.value || null)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">顧問先を選択してください</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 授受区分とドキュメント設定 */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-2">ドキュメント設定</h2>

        {/* 授受区分 */}
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">授受区分</h3>
          <div className="flex gap-2">
            {transferTypeOptions.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTransferType(type)}
                className={`px-4 py-2 rounded ${
                  selectedTransferType === type
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* ドキュメント種類選択 */}
        {selectedClientId && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">
              ドキュメント種類{" "}
              <span className="text-gray-500 text-xs">(任意)</span>
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {getCurrentClientDocTypes().map((docType) => (
                <button
                  key={docType.type}
                  onClick={() => handleDocTypeChange(docType.type)}
                  className={`px-4 py-2 rounded text-sm ${
                    selectedDocType === docType.type
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {docType.type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* サブタイプ選択 */}
        {selectedDocType && getSubTypesForSelectedDocType().length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">
              サブタイプ <span className="text-gray-500 text-xs">(任意)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {getSubTypesForSelectedDocType().map((subType) => (
                <button
                  key={subType}
                  onClick={() =>
                    setSelectedSubType(
                      subType === selectedSubType ? null : subType
                    )
                  }
                  className={`px-3 py-1 rounded text-sm ${
                    selectedSubType === subType
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {subType}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 確認ダイアログ */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          title="Supabaseへエクスポート"
          message={`選択した${
            Object.values(receiptSelection).filter(Boolean).length
          }件のレシートをSupabaseデータベースにエクスポートします。この操作は取り消せません。`}
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
                <li>授受区分: {selectedTransferType}</li>
                {selectedDocType && (
                  <li>ドキュメント種類: {selectedDocType}</li>
                )}
                {selectedSubType && <li>サブタイプ: {selectedSubType}</li>}
              </ul>
            </div>
          }
        />
      )}

      {/* レシート選択 */}
      <div className="mb-20">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">エクスポートするデータ選択</h2>
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

        {receipts.length === 0 ? (
          <p className="text-gray-500">エクスポート可能なデータがありません</p>
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
                    メモ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receipts.map((receipt) => (
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
                    </td>
                    <td className="px-3 py-4 truncate max-w-xs">
                      {receipt.memo}
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
          <span className="text-gray-500">
            {Object.values(receiptSelection).filter(Boolean).length}件選択中
          </span>

          <button
            onClick={() => setIsConfirmDialogOpen(true)}
            disabled={
              isSyncing ||
              !selectedClientId ||
              Object.values(receiptSelection).filter(Boolean).length === 0
            }
            className={`px-6 py-2 rounded font-medium
              ${
                isSyncing ||
                !selectedClientId ||
                Object.values(receiptSelection).filter(Boolean).length === 0
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
