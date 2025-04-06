import { useState } from "react";
import { useRouter } from "next/router";
import FileUploader from "../components/FileUploader";
import { usePdfProcessing } from "../hooks/usePdfProcessing";
import { useReceiptContext } from "../contexts/ReceiptContext";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const router = useRouter();
  const {
    processFiles,
    isProcessing,
    error: processingError,
  } = usePdfProcessing();
  const { setReceipts } = useReceiptContext();
  const [error, setError] = useState<string | null>(null);

  // ファイルの選択処理
  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  // アップロード処理

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("ファイルをアップロードしてください");
      return;
    }

    setError(null);

    try {
      // OCR実行を削除し、ファイルの処理のみを行う
      const results = await processFiles(files, mergeMode);

      if (results.length > 0) {
        // ReceiptContext を通じて結果を保存
        setReceipts(results);

        // 処理が完了したらグループ化ページに遷移
        router.push("/group");
      } else {
        setError("ファイルの処理結果が得られませんでした");
      }
    } catch (err) {
      console.error("Upload processing error:", err);
      setError("ファイル処理中にエラーが発生しました");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">領収書アップロード</h1>

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
            disabled={isProcessing || files.length === 0}
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
