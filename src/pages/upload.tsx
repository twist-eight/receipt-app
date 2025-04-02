// src/pages/upload.tsx
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
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

      <ul className="mt-6 space-y-2">
        {files.map((file, i) => (
          <li key={i} className="bg-gray-100 p-2 rounded shadow-sm">
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
