// src/pages/upload.tsx
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);

    const newPreviews = acceptedFiles.map((file) => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file); // ← 画像用のプレビューURLを生成
      } else {
        return ""; // PDFなどは空でOK
      }
    });

    setPreviews((prev) => [...prev, ...newPreviews]);
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
            クリックまたはファイルをドロップしてアップロード
          </p>
        )}
      </div>

      <ul className="mt-6 space-y-4">
        {files.map((file, i) => (
          <li
            key={i}
            className="bg-gray-100 p-3 rounded shadow-sm flex items-center gap-4"
          >
            {previews[i] ? (
              <Image
                src={previews[i]}
                alt={file.name}
                width={64}
                height={64}
                className="object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-300 flex items-center justify-center rounded text-sm text-gray-700">
                PDF
              </div>
            )}
            <span className="text-sm">{file.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
