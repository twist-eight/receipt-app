import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link"; // 追加
import FileUploader from "../components/FileUploader";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { useReceiptContext } from "../contexts/ReceiptContext";
import { useClientContext } from "../contexts/ClientContext"; // 追加
import { ReceiptType, TransferType } from "../types/receipt"; // TransferTypeを追加

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedType, setSelectedType] = useState<ReceiptType | null>(null);
  // 授受区分の状態を追加
  const [transferType, setTransferType] = useState<TransferType>("受取");
  const router = useRouter();
  const {
    processFiles,
    isProcessing,
    error: processingError,
  } = usePdfProcessing();
  const { setReceipts } = useReceiptContext();
  const { selectedClientId, clients } = useClientContext(); // 追加：顧問先コンテキスト
  const [error, setError] = useState<string | null>(null);

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

  // 選択中の顧問先情報
  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;

  // ファイルの選択処理
  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  // 種類選択処理
  const handleTypeSelect = (type: ReceiptType) => {
    setSelectedType(selectedType === type ? null : type);
  };

  // アップロード処理
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("ファイルをアップロードしてください");
      return;
    }

    // 顧問先が選択されているか確認
    if (!selectedClientId) {
      setError(
        "顧問先が選択されていません。トップページで顧問先を選択してください。"
      );
      return;
    }

    setError(null);

    try {
      console.log(
        `Processing ${files.length} files with mergeMode: ${mergeMode}`
      ); // デバッグ用ログ

      // PDFファイルの存在確認
      const pdfFiles = files.filter((file) => file.type === "application/pdf");
      console.log(`Found ${pdfFiles.length} PDF files`); // デバッグ用ログ

      // OCR実行を削除し、ファイルの処理のみを行う
      const results = await processFiles(files, mergeMode);

      if (results.length > 0) {
        console.log(`Processed ${results.length} files, first result:`, {
          id: results[0].id,
          pages: results[0].imageUrls?.length,
        }); // デバッグ用ログ

        // 選択した種類がある場合、すべての結果に適用
        if (selectedType) {
          results.forEach((result) => {
            result.type = selectedType;
          });
        }

        // 授受区分を適用
        results.forEach((result) => {
          result.transferType = transferType;
        });

        // ReceiptContext を通じて結果を保存
        setReceipts(results);

        // 処理が完了したらグループ化ページに遷移
        router.push("/group");
      } else {
        setError("ファイルの処理結果が得られませんでした");
      }
    } catch (err) {
      console.error("Upload processing error:", err);
      setError(
        `ファイル処理中にエラーが発生しました: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">領収書アップロード</h1>

      {/* 顧問先情報表示 */}
      {selectedClient ? (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="font-medium">顧問先: {selectedClient.name}</p>
          <p className="text-sm text-gray-600">
            この顧問先に対してドキュメントをアップロードします
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

      {/* FileUploader コンポーネントを使用 */}
      <FileUploader
        onFilesChange={handleFilesChange}
        accept="image/*,application/pdf"
        multiple={true}
        maxFiles={20}
        className="mb-6"
      />

      <div className="flex items-center mb-6">
        <input
          id="merge-mode"
          type="checkbox"
          className="mr-2 h-4 w-4"
          checked={mergeMode}
          onChange={(e) => setMergeMode(e.target.checked)}
        />
        <label htmlFor="merge-mode" className="cursor-pointer">
          複数ページPDFを1件として保存（明細書など）
        </label>
      </div>
      {/* 授受区分選択ボタン（追加） */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-2">授受区分：</p>
        <div className="flex flex-wrap gap-2">
          {transferTypeOptions.map((type) => (
            <button
              key={type}
              onClick={() => setTransferType(type)}
              className={`px-3 py-2 rounded ${
                transferType === type
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          すべてのファイルに適用される授受区分を選択してください。
        </p>
      </div>
      {/* 種類選択ボタン */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-2">ドキュメント種類（任意）：</p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className={`px-3 py-2 rounded ${
                selectedType === type
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          選択するとすべてのファイルに適用されます。選択しない場合はデフォルト（領収書）が適用されます。
        </p>
      </div>

      {/* エラー表示 -processFiles からのエラーとローカルのエラーを両方表示 */}
      {(processingError || error) && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {processingError || error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            onClick={handleUpload}
            disabled={isProcessing || files.length === 0 || !selectedClientId}
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
              "実行（新規）"
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          ※ 新規アップロードでは、以前のデータを全て置き換えます
        </p>
      </div>
    </div>
  );
}
