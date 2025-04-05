import { useState } from "react";
import { useRouter } from "next/router";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import FileUploader from "../components/FileUploader"; // 既存のコンポーネントがあればインポート
import { v4 as uuidv4 } from "uuid";
import { ReceiptItem } from "../types/receipt";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ファイルの選択処理
  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  // ファイルの削除処理
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // PDFページを画像に変換
  const pdfPageToImage = async (
    pdfData: Uint8Array,
    pageIndex: number
  ): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context!, viewport }).promise;
    return canvas.toDataURL("image/jpeg");
  };

  // PDFを複数ページに分割
  const splitPdfPages = async (
    file: File
  ): Promise<{ imageUrl: string; pdfUrl: string }[]> => {
    const results = [];
    const data = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(data);
    const totalPages = pdfDoc.getPageCount();

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const imageUrl = await pdfPageToImage(
        new Uint8Array(await pdfBlob.arrayBuffer()),
        0
      );
      results.push({ pdfUrl, imageUrl });
    }

    return results;
  };

  // アップロード処理
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("ファイルをアップロードしてください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 新しいレシートアイテム配列を作成
      const newResults: ReceiptItem[] = [];

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        if (file.type === "application/pdf") {
          if (mergeMode) {
            const pdfUrl = URL.createObjectURL(file);
            const imageUrl = await pdfPageToImage(
              new Uint8Array(await file.arrayBuffer()),
              0
            );
            newResults.push({
              id: uuidv4(), // 一意のIDを生成
              imageUrl,
              pdfUrl,
              date: new Date().toISOString().split("T")[0], // 今日の日付
              vendor: "",
              amount: 0,
              type: "領収書",
              memo: "",
              tag: "",
              status: "完了",
            });
          } else {
            const pages = await splitPdfPages(file);
            pages.forEach((page) => {
              newResults.push({
                id: uuidv4(), // 一意のIDを生成
                imageUrl: page.imageUrl,
                pdfUrl: page.pdfUrl,
                date: new Date().toISOString().split("T")[0],
                vendor: "",
                amount: 0,
                type: "領収書",
                memo: "",
                tag: "",
                status: "完了",
              });
            });
          }
        } else if (file.type.startsWith("image/")) {
          const imageUrl = URL.createObjectURL(file);
          const pdfDoc = await PDFDocument.create();
          const imageBytes = await file.arrayBuffer();
          const ext = file.type.split("/")[1];
          const embedded =
            ext === "png"
              ? await pdfDoc.embedPng(imageBytes)
              : await pdfDoc.embedJpg(imageBytes);

          const page = pdfDoc.addPage();
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: page.getWidth(),
            height: page.getHeight(),
          });

          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const pdfUrl = URL.createObjectURL(blob);

          newResults.push({
            id: uuidv4(), // 一意のIDを生成
            imageUrl,
            pdfUrl,
            date: new Date().toISOString().split("T")[0],
            vendor: "",
            amount: 0,
            type: "領収書",
            memo: "",
            tag: "",
            status: "完了",
          });
        }
      }

      // 重要: 既存のデータと結合せずに、新しいデータのみを保存する
      // replaceモードでセッションストレージに保存するかどうかを選べるようにする
      const shouldReplace = true; // この値を制御するUIを必要に応じて追加できます

      if (shouldReplace) {
        // 既存データを消去して新しいデータのみを保存
        sessionStorage.setItem("ocrResults", JSON.stringify(newResults));
      } else {
        // 既存データを取得して結合する（従来の動作）
        try {
          const existingData = sessionStorage.getItem("ocrResults");
          if (existingData) {
            const parsedData = JSON.parse(existingData) as ReceiptItem[];
            if (Array.isArray(parsedData)) {
              // 既存データと新しいデータを結合
              const combinedResults = [...parsedData, ...newResults];
              sessionStorage.setItem(
                "ocrResults",
                JSON.stringify(combinedResults)
              );
            } else {
              // 既存データが配列でない場合は新しいデータのみを保存
              sessionStorage.setItem("ocrResults", JSON.stringify(newResults));
            }
          } else {
            // 既存データがない場合は新しいデータのみを保存
            sessionStorage.setItem("ocrResults", JSON.stringify(newResults));
          }
        } catch (e) {
          console.error("Error processing existing data:", e);
          // エラーが発生した場合は新しいデータのみを保存
          sessionStorage.setItem("ocrResults", JSON.stringify(newResults));
        }
      }

      // 処理が完了したらレビューページに遷移
      router.push("/review");
    } catch (err) {
      console.error("Upload processing error:", err);
      setError("ファイル処理中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // FileUploaderコンポーネントがない場合は、この簡易ファイル選択UIを使用
  const SimpleFileSelector = () => (
    <div className="mb-4">
      <input
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFilesChange}
        className="mb-4"
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        {files.map((file, index) => (
          <div key={index} className="border p-2 rounded shadow-sm relative">
            <p className="text-sm truncate">{file.name}</p>
            <button
              className="absolute top-1 right-1 text-red-500"
              onClick={() => handleRemoveFile(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">領収書アップロード</h1>

      {/* FileUploaderコンポーネントがあればそれを使用、なければ簡易版を表示 */}
      {typeof FileUploader !== "undefined" ? (
        <FileUploader onFilesChange={setFiles} />
      ) : (
        <SimpleFileSelector />
      )}

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

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
            onClick={handleUpload}
            disabled={isLoading || files.length === 0}
          >
            {isLoading ? (
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
              "OCR実行（新規）"
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
