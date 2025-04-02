// src/pages/upload.tsx

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import Image from "next/image";

// PDF.js の worker 設定
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type ReceiptSet = {
  pdf?: File;
  image?: File;
};

export default function UploadPage() {
  const [receiptSets, setReceiptSets] = useState<ReceiptSet[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.type === "application/pdf") {
        // PDF → 画像変換処理
        const reader = new FileReader();

        reader.onload = async () => {
          const typedArray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;

          canvas.toBlob((blob) => {
            if (blob) {
              const imageFile = new File(
                [blob],
                file.name.replace(/\.pdf$/, ".jpg"),
                {
                  type: "image/jpeg",
                }
              );

              setReceiptSets((prev) => [
                ...prev,
                { pdf: file, image: imageFile },
              ]);
            }
          }, "image/jpeg");
        };

        reader.readAsArrayBuffer(file);
      }

      // TODO: 画像 → PDF変換（次ステップで実装）
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "application/pdf": [],
    },
    multiple: true,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">領収書アップロード</h1>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">ここにファイルをドロップしてください</p>
        ) : (
          <p className="text-gray-600">
            クリックまたはドロップしてファイルをアップロード
          </p>
        )}
      </div>

      <ul className="mt-6 space-y-4">
        {receiptSets.map((set, i) => (
          <li key={i} className="bg-gray-100 p-3 rounded shadow-sm">
            <p className="text-sm font-bold">セット {i + 1}</p>
            <div className="flex gap-4 items-center mt-2">
              {set.image && (
                <Image
                  src={URL.createObjectURL(set.image)}
                  alt="preview"
                  width={96}
                  height={96}
                  className="object-cover rounded"
                />
              )}
              <span className="text-xs text-gray-700">{set.pdf?.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
