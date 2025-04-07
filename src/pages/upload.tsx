import { useState } from "react";
import { useRouter } from "next/router";
import FileUploader from "../components/FileUploader";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { ReceiptType } from "../types/receipt";
import { uploadPdfAndCreateReceipt } from "../utils/receiptApi";
import { useReceiptContext } from "../contexts/ReceiptContext";

import { v4 as uuidv4 } from "uuid";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedType, setSelectedType] = useState<ReceiptType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { isProcessing } = usePdfProcessing();
  const [error, setError] = useState<string | null>(null);

  // 種類のオプション
  const typeOptions: ReceiptType[] = [
    "領収書",
    "明細書",
    "契約書",
    "見積書",
    "通帳",
  ];

  // ファイルの選択処理
  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  // 種類選択処理
  const handleTypeSelect = (type: ReceiptType) => {
    setSelectedType(selectedType === type ? null : type);
  };

  // アップロード処理（Supabase版）
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("ファイルをアップロードしてください");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 複数のPDFを処理
      const uploadedReceipts = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Supabaseへのアップロード処理
        const today = new Date().toISOString().split("T")[0];
        const receiptData = {
          id: uuidv4(),
          imageUrls: [],
          pdfUrl: "", // アップロード後に設定される
          date: today,
          updatedAt: today,
          vendor: "",
          amount: 0,
          type: selectedType || "領収書",
          memo: "",
          tag: "",
          status: "完了",
        };

        const result = await uploadPdfAndCreateReceipt(file, receiptData);

        if (result.success && result.data) {
          uploadedReceipts.push(result.data);
        } else {
          throw new Error(result.error || "アップロードに失敗しました");
        }

        // 進捗を更新
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // アップロードしたデータをコンテキストに設定
      if (uploadedReceipts.length > 0) {
        const { setReceipts } = useReceiptContext();

        // 次のページに遷移
        router.push("/group");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "ファイルのアップロードに失敗しました"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">領収書アップロード</h1>

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

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* アップロード進捗表示 */}
      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            アップロード中... {uploadProgress}%
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            onClick={handleUpload}
            disabled={isUploading || isProcessing || files.length === 0}
          >
            {isUploading || isProcessing ? (
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
          ※ Supabaseへの保存が有効になりました。PDFのみが保存されます。
        </p>
      </div>
    </div>
  );
}
